import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import rateLimit from 'express-rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { Resend } from 'resend';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  db, createUser, getUserByEmail, getUserById, updateUserPlan,
  incrementUsage, resetUsageIfNeeded, addLead, addSummary, getStats,
  getCachedSummary, setCachedSummary, getAnonUsage, incrementAnonUsage,
} from './db.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is required in production');
    process.exit(1);
  }
  console.warn('[WARN] JWT_SECRET not set — using insecure dev fallback. DO NOT ship this to production.');
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'yepitsai-dev-fallback-DO-NOT-SHIP';
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'YepIts.ai <pava@yepits.ai>';
const APP_URL = process.env.APP_URL || (process.env.NODE_ENV === 'production' ? 'https://yepits.ai' : 'http://localhost:5173');

// Cache and usage tracking now live in SQLite (see db.js) so they
// survive server restarts and redeploys. The old in-memory Map was lost
// every time the process restarted, which meant popular videos got
// re-summarized for free on every deploy and the anon 3/day limit reset.

// Ensure /data directory exists for SQLite
try { fs.mkdirSync('/data', { recursive: true }); } catch {}

// ============================================================
// Security headers
// ============================================================
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

const allowedOrigins = (process.env.CORS_ORIGINS || 'https://yepits.ai,http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin / curl / server-to-server (no Origin header)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // Allow Chrome extensions with explicit host_permissions for this domain.
    // Their Origin header is `chrome-extension://<EXTENSION_ID>`; only extensions
    // that declared host_permissions for yepits.ai can send one, so this is safe.
    if (origin.startsWith('chrome-extension://')) return cb(null, true);
    // Disallowed: respond without CORS headers (browser will block the request)
    return cb(null, false);
  },
  methods: ['GET', 'POST', 'DELETE'],
  credentials: false,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting — auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
});

// Rate limiting — general API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
});

app.use('/api/auth/', authLimiter);
app.use('/api/', apiLimiter);

// Webhook needs raw body — register BEFORE other middleware
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe) return res.status(400).json({ error: 'Stripe not configured' });
  
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) {
    console.log('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    if (userId) {
      updateUserPlan(userId, 'pro', session.customer, session.subscription);
      console.log(`User ${userId} upgraded to Pro`);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const user = db.prepare('SELECT * FROM users WHERE stripe_subscription_id = ?').get(subscription.id);
    if (user) {
      updateUserPlan(user.id, 'free', user.stripe_customer_id, null);
      console.log(`User ${user.id} downgraded to free`);
    }
  }

  res.json({ received: true });
});

// ============================================================
// Email helpers
// ============================================================
async function sendEmail(to, subject, text) {
  if (!resend) { console.log(`[email skipped] to=${to} subject=${subject}`); return; }
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, text });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ============================================================
// Auth middleware (optional for free tier)
// ============================================================
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET);
    const user = getUserByEmail(decoded.email);
    if (!user) return res.status(401).json({ error: 'Account not found.' });
    req.user = resetUsageIfNeeded(user);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

// Optional auth — allow both authenticated users and anonymous (IP-based)
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET);
      const user = getUserByEmail(decoded.email);
      if (user) {
        req.user = resetUsageIfNeeded(user);
        return next();
      }
    } catch {}
  }

  // Anonymous user — load balance from SQLite (survives restarts)
  const anonIp = req.ip || req.connection.remoteAddress || 'unknown';
  const anonState = getAnonUsage(anonIp);
  req.user = {
    id: `anon_${anonIp}`,
    email: null,
    plan: 'free',
    summaries_used: anonState.summaries_used,
    summaries_reset_at: anonState.summaries_reset_at,
  };
  next();
}

// ============================================================
// Auth routes
// ============================================================
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  const normalized = email.toLowerCase().trim();
  if (getUserByEmail(normalized)) return res.status(409).json({ error: 'An account with this email already exists.' });

  const passwordHash = await bcrypt.hash(password, 10);
  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const verifyToken = generateToken();
  const user = createUser({ id, email: normalized, passwordHash, verifyToken });

  // Send verification email
  const verifyUrl = `${APP_URL}?verify=${verifyToken}`;
  await sendEmail(normalized, 'Verify your YepIts.ai account', `Welcome to YepIts.ai!\n\nPlease verify your email by clicking this link:\n${verifyUrl}\n\nIf you didn't sign up, you can ignore this email.`);

  const token = jwt.sign({ email: normalized, id: user.id }, EFFECTIVE_JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { email: normalized, plan: 'free', verified: false } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const normalized = email.toLowerCase().trim();
  const user = getUserByEmail(normalized);
  if (!user) return res.status(401).json({ error: 'No account found with this email.' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Incorrect password.' });

  const token = jwt.sign({ email: normalized, id: user.id }, EFFECTIVE_JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { email: normalized, plan: user.plan, verified: !!user.email_verified } });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ email: req.user.email, plan: req.user.plan, verified: !!req.user.email_verified });
});

// Email verification
app.get('/api/auth/verify', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Verification token required.' });
  const user = db.prepare('SELECT * FROM users WHERE verify_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or expired verification token.' });
  db.prepare('UPDATE users SET email_verified = 1, verify_token = NULL WHERE id = ?').run(user.id);
  res.json({ ok: true, message: 'Email verified successfully.' });
});

// Password reset — request
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  const normalized = email.toLowerCase().trim();
  const user = getUserByEmail(normalized);
  if (!user) {
    // Don't reveal whether email exists
    return res.json({ ok: true, message: 'If an account exists, a reset link has been sent.' });
  }
  const resetToken = generateToken();
  const resetExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?').run(resetToken, resetExpiry, user.id);

  const resetUrl = `${APP_URL}?reset=${resetToken}`;
  await sendEmail(normalized, 'Reset your YepIts.ai password', `You requested a password reset.\n\nClick here to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`);
  res.json({ ok: true, message: 'If an account exists, a reset link has been sent.' });
});

// Password reset — confirm
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and new password are required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid reset token.' });
  if (Date.now() > user.reset_expires) return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });

  const passwordHash = await bcrypt.hash(password, 10);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?').run(passwordHash, user.id);
  res.json({ ok: true, message: 'Password reset successfully. You can now log in.' });
});

// Account deletion (GDPR right to erasure)
app.delete('/api/auth/delete', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM summaries WHERE user_id = ?').run(req.user.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ error: 'Could not delete account. Please contact support.' });
  }
});

// ============================================================
// Stripe customer portal (self-serve cancel/manage)
// ============================================================
app.post('/api/stripe/portal', auth, async (req, res) => {
  if (!stripe) return res.status(400).json({ error: 'Payments not configured.' });
  try {
    const user = getUserById(req.user.id);
    if (!user?.stripe_customer_id) return res.status(400).json({ error: 'No billing account found.' });
    
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${APP_URL}`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal error:', err);
    res.status(500).json({ error: 'Could not open billing portal.' });
  }
});

// ============================================================
// Pricing tiers — easily configurable
// ============================================================
const TIERS = {
  free: {
    summaries_per_day: 3,
    max_video_length: 15, // minutes
    features: ['Key takeaways', 'Timestamps', 'Copy to clipboard'],
  },
  pro: {
    summaries_per_day: Infinity,
    max_video_length: Infinity,
    features: ['Unlimited summaries', 'Any video length', 'Export to .md/.txt', 'No ads'],
  },
};

// ============================================================
// Usage tracking
// ============================================================
function checkUsage(user) {
  const tier = TIERS[user.plan] || TIERS.free;
  const limit = tier.summaries_per_day;
  const used = user.summaries_used || 0;
  if (used >= limit) return { allowed: false, remaining: 0, limit };
  return { allowed: true, remaining: limit - used, limit };
}

function getVideoLengthLimit(user) {
  const tier = TIERS[user.plan] || TIERS.free;
  return tier.max_video_length;
}

// ============================================================
// Extract video ID
// ============================================================
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

// ============================================================
// HTTPS fetch helper
// ============================================================
function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      timeout: 10000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, options).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ============================================================
// Video metadata
// ============================================================
async function getVideoMeta(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (res.ok) {
      const data = await res.json();
      return { title: data.title, channel: data.author_name };
    }
  } catch {}
  return { title: 'YouTube Video', channel: '' };
}

// ============================================================
// Transcript fetching (InnerTube API)
// ============================================================
async function getTranscript(videoId) {
  // Try multiple client strategies — YouTube changes these frequently
  const clients = [
    {
      name: 'ANDROID',
      body: { context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', hl: 'en', gl: 'US' } }, videoId },
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11)' },
    },
    {
      name: 'IOS',
      body: { context: { client: { clientName: 'IOS', clientVersion: '20.10.38', hl: 'en', gl: 'US', deviceModel: 'iPhone16,2' } }, videoId },
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'com.google.ios.youtube/20.10.38 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X)' },
    },
    {
      name: 'TVHTML5',
      body: { context: { client: { clientName: 'TVHTML5', clientVersion: '7.20241201.18.00', hl: 'en', gl: 'US' } }, videoId },
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (PlayStation; PlayStation 4/12.00) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15' },
    },
    {
      name: 'WEB',
      body: { context: { client: { clientName: 'WEB', clientVersion: '2.20241201.00.00', hl: 'en', gl: 'US' } }, videoId },
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
    },
  ];

  for (const client of clients) {
    try {
      const responseText = await fetchUrl('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        body: JSON.stringify(client.body),
        headers: client.headers,
      });
      const data = JSON.parse(responseText);
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

      if (tracks.length === 0) {
        console.log(`Transcript: ${client.name} returned no tracks`);
        continue;
      }

      const enTrack = tracks.find(t => t.languageCode?.startsWith('en')) || tracks[0];

      if (enTrack?.baseUrl) {
        const formats = ['json3', 'srv3', 'srv2', 'srv1'];
        let segments = [];

        for (const fmt of formats) {
          try {
            const transcriptUrl = enTrack.baseUrl + (enTrack.baseUrl.includes('?') ? '&' : '?') + `fmt=${fmt}`;
            const transcriptRaw = await fetchUrl(transcriptUrl);

            if (fmt === 'json3' && transcriptRaw.trim().startsWith('{')) {
              const parsed = JSON.parse(transcriptRaw);
              for (const event of (parsed.events || [])) {
                if (!event.segs) continue;
                const text = event.segs.map(s => s.utf8 || '').join('').trim();
                if (text && text !== '\n') {
                  segments.push({ text, offset: event.tStartMs || 0, duration: event.dDurationMs || 0 });
                }
              }
            } else if (transcriptRaw.trim().startsWith('<')) {
              const textMatches = [...transcriptRaw.matchAll(/<text[^>]*start="([\d.]+)"[^>]*(?:dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g)];
              for (const m of textMatches) {
                const rawText = m[3].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
                if (rawText) {
                  segments.push({ text: rawText, offset: Math.floor(parseFloat(m[1]) * 1000), duration: Math.floor((parseFloat(m[2]) || 0) * 1000) });
                }
              }
            }

            if (segments.length > 0) {
              console.log(`Transcript: ${client.name} + ${fmt} = ${segments.length} segments`);
              return segments;
            }
          } catch (e) {
            console.log(`Format ${fmt} failed:`, e.message);
          }
        }
      }
    } catch (e) {
      console.log(`InnerTube ${client.name} failed:`, e.message);
    }
  }

  // Last resort: youtube-transcript library
  try {
    const { YoutubeTranscript } = await import('youtube-transcript');
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    if (transcript?.length > 0) {
      console.log(`Transcript: library fallback = ${transcript.length} segments`);
      return transcript;
    }
  } catch (e) {
    console.log('Library failed:', e.message);
  }

  return null;
}

function getDurationFromTranscript(transcript) {
  if (!transcript?.length) return 0;
  const last = transcript[transcript.length - 1];
  return Math.ceil((last.offset + last.duration) / 60000);
}

// ============================================================
// Claude summarization
// ============================================================
async function summarizeWithClaude(transcriptText, videoTitle) {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: `You are an expert content summarizer. Below is the transcript of a YouTube video titled "${videoTitle}".

Provide a JSON response:
{
  "summary": "2-3 concise paragraphs summarizing the main points.",
  "takeaways": ["3-5 key takeaways", "..."],
  "timestamps": [{"time": "MM:SS", "seconds": 123, "label": "Brief description"}, "..."]
}

Rules: 2-3 paragraphs (2-3 sentences each). Takeaways actionable. 3-5 timestamps spread throughout. MM:SS format. Return ONLY valid JSON.

Transcript:
${transcriptText}` }],
  });

  let clean = message.content[0].text.trim();
  if (clean.startsWith('```')) clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error('Claude JSON parse failed:', e.message, 'Raw:', clean.slice(0, 200));
    return {
      summary: clean.slice(0, 500) || 'Summary could not be generated. Please try another video.',
      takeaways: [],
      timestamps: [],
    };
  }
}

// ============================================================
// MAIN ENDPOINT — Now supports both auth and anonymous
// ============================================================
app.post('/api/summarize', optionalAuth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL.' });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: 'Could not parse YouTube URL. Please paste a valid YouTube link.' });

    // Check usage AFTER we know it's a valid video, but DON'T increment yet
    const usage = checkUsage(req.user);
    if (!usage.allowed) {
      return res.status(402).json({
        error: `You've used all ${usage.limit} free summaries for today. Upgrade to Pro for unlimited summaries.`,
        limitReached: true,
      });
    }

    // Check cache first — massive cost savings!
    const cached = getCachedSummary(videoId);
    if (cached) {
      return res.json({
        title: cached.title, channel: cached.channel, duration: cached.duration, videoId,
        summary: cached.summary, takeaways: cached.takeaways, timestamps: cached.timestamps,
        remaining: usage.remaining, limit: usage.limit,
        cached: true, // Let frontend know this was cached
      });
    }

    const transcript = await getTranscript(videoId);
    if (!transcript) {
      return res.status(400).json({
        error: "This video doesn't have captions. Try a video with auto-generated or manual captions.",
      });
    }

    const durationMinutes = getDurationFromTranscript(transcript);
    const maxLength = getVideoLengthLimit(req.user);

    // Check if video exceeds tier limit
    if (durationMinutes > maxLength) {
      const meta = await getVideoMeta(videoId);
      return res.json({
        proRequired: true,
        duration: durationMinutes,
        title: meta.title,
        channel: meta.channel,
        videoId,
        tier: req.user.plan,
        maxLength,
      });
    }

    // Do the actual summary
    const transcriptText = transcript
      .map(e => {
        const s = Math.floor(e.offset / 1000);
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} ${e.text}`;
      })
      .join('\n');

    const [meta, summary] = await Promise.all([
      getVideoMeta(videoId),
      summarizeWithClaude(transcriptText, videoId),
    ]);

    // Cache the summary for future requests
    setCachedSummary(videoId, { title: meta.title, channel: meta.channel, duration: durationMinutes, summary: summary.summary, takeaways: summary.takeaways, timestamps: summary.timestamps });

    // Only increment usage AFTER successful summary
    if (req.user.id.startsWith('anon_')) {
      // Anonymous user — persist the counter to SQLite so it survives restarts
      const anonIp = req.user.id.slice('anon_'.length);
      incrementAnonUsage(anonIp);
      req.user.summaries_used += 1;
      req.user.summaries_reset_at = getAnonUsage(anonIp).summaries_reset_at;
    } else {
      // Authenticated user — increment in DB
      incrementUsage(req.user.id);
      addSummary(req.user.id, videoId, meta.title);
    }

    // Recompute `usage` after the increment so the response reflects the
    // post-request counter for both anon and authenticated users.
    const updatedUsage = checkUsage(req.user);

    res.json({
      title: meta.title, channel: meta.channel, duration: durationMinutes, videoId,
      summary: summary.summary, takeaways: summary.takeaways, timestamps: summary.timestamps,
      remaining: updatedUsage.remaining, limit: usage.limit,
    });
  } catch (err) {
    console.error('Summarize error:', err);
    res.status(500).json({ error: 'Something went wrong while summarizing. Please try again.' });
  }
});

// ============================================================
// Usage, Leads, Stripe checkout
// ============================================================
app.get('/api/usage', auth, (req, res) => {
  const usage = checkUsage(req.user);
  res.json({ plan: req.user.plan, used: req.user.summaries_used, remaining: usage.remaining, limit: usage.limit });
});

app.post('/api/leads', (req, res) => {
  const { email, source } = req.body;
  if (!email?.includes('@')) return res.status(400).json({ error: 'Valid email required.' });
  addLead(email.toLowerCase().trim(), source || 'unknown');
  res.json({ ok: true });
});

// Stripe checkout
app.post('/api/create-checkout-session', auth, async (req, res) => {
  if (!stripe || !STRIPE_PRICE_ID) return res.json({ status: 'coming_soon' });

  try {
    const origin = req.headers.origin || req.headers.referer || APP_URL;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      metadata: { userId: req.user.id },
      customer_email: req.user.email,
      subscription_data: { metadata: { userId: req.user.id } },
      success_url: `${origin}?upgraded=1`,
      cancel_url: `${origin}?canceled=1`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: 'Could not create checkout session.' });
  }
});

app.get('/api/stripe-config', (req, res) => {
  res.json({ publishableKey: STRIPE_PUBLISHABLE_KEY, priceId: STRIPE_PRICE_ID });
});

// ============================================================
// Compare two video summaries
// ============================================================
app.post('/api/compare', optionalAuth, async (req, res) => {
  try {
    const { url1, url2 } = req.body;
    if (!url1 || !url2) return res.status(400).json({ error: 'Two YouTube URLs required.' });

    const videoId1 = extractVideoId(url1);
    const videoId2 = extractVideoId(url2);
    if (!videoId1 || !videoId2) return res.status(400).json({ error: 'Invalid YouTube URLs.' });

    // Get both summaries (from cache or generate)
    let summary1 = getCachedSummary(videoId1);
    let summary2 = getCachedSummary(videoId2);

    if (!summary1) {
      const transcript1 = await getTranscript(videoId1);
      if (!transcript1) return res.status(400).json({ error: 'Video 1 has no captions.' });
      const text1 = transcript1.map(e => {
        const s = Math.floor(e.offset / 1000);
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} ${e.text}`;
      }).join('\n');
      const meta1 = await getVideoMeta(videoId1);
      const sum1 = await summarizeWithClaude(text1, videoId1);
      summary1 = { title: meta1.title, channel: meta1.channel, duration: getDurationFromTranscript(transcript1), ...sum1 };
      setCachedSummary(videoId1, summary1);
    }

    if (!summary2) {
      const transcript2 = await getTranscript(videoId2);
      if (!transcript2) return res.status(400).json({ error: 'Video 2 has no captions.' });
      const text2 = transcript2.map(e => {
        const s = Math.floor(e.offset / 1000);
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} ${e.text}`;
      }).join('\n');
      const meta2 = await getVideoMeta(videoId2);
      const sum2 = await summarizeWithClaude(text2, videoId2);
      summary2 = { title: meta2.title, channel: meta2.channel, duration: getDurationFromTranscript(transcript2), ...sum2 };
      setCachedSummary(videoId2, summary2);
    }

    // Calculate similarity (simple: count matching takeaways)
    const matchingTakeaways = (summary1.takeaways || []).filter(t1 =>
      (summary2.takeaways || []).some(t2 => t1.toLowerCase().includes(t2.toLowerCase().substring(0, 30)) || t2.toLowerCase().includes(t1.toLowerCase().substring(0, 30)))
    ).length;
    const similarity = Math.round((matchingTakeaways / Math.max(1, (summary1.takeaways || []).length)) * 100);

    res.json({
      video1: { videoId: videoId1, ...summary1 },
      video2: { videoId: videoId2, ...summary2 },
      similarity, // percentage
      matchingTakeaways,
    });
  } catch (err) {
    console.error('Compare error:', err);
    res.status(500).json({ error: 'Could not compare videos.' });
  }
});

// ============================================================
// Health
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ...getStats() });
});

// ============================================================
// Serve frontend
// ============================================================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  const publicPath = path.join(__dirname, '../public');
  // Public static assets (robots.txt, llms.txt, sitemap.xml, favicon.svg, etc.) win over SPA fallback
  app.use(express.static(publicPath));
  app.use(express.static(distPath));

  const staticPages = ['privacy', 'terms', 'cookies', 'refund', 'dmca'];
  staticPages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
      res.sendFile(path.join(distPath, `${page}.html`));
    });
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n  YepIts.ai server running on http://localhost:${PORT}\n`);
});
