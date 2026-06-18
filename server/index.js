import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import Anthropic from '@anthropic-ai/sdk';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  db, createUser, getUserByEmail, getUserById, updateUserPlan,
  incrementUsage, resetUsageIfNeeded, addLead, addSummary, getStats
} from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const JWT_SECRET = process.env.JWT_SECRET || 'yepitsai-dev-secret';
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';

// Ensure /data directory exists for SQLite
try { fs.mkdirSync('/data', { recursive: true }); } catch {}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
// Auth middleware
// ============================================================
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = getUserByEmail(decoded.email);
    if (!user) return res.status(401).json({ error: 'Account not found.' });
    req.user = resetUsageIfNeeded(user);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

// ============================================================
// Auth routes
// ============================================================
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  const normalized = email.toLowerCase().trim();
  if (getUserByEmail(normalized)) return res.status(409).json({ error: 'An account with this email already exists.' });

  const passwordHash = await bcrypt.hash(password, 10);
  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const user = createUser({ id, email: normalized, passwordHash });

  const token = jwt.sign({ email: normalized, id: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { email: normalized, plan: 'free' } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const normalized = email.toLowerCase().trim();
  const user = getUserByEmail(normalized);
  if (!user) return res.status(401).json({ error: 'No account found with this email.' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Incorrect password.' });

  const token = jwt.sign({ email: normalized, id: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { email: normalized, plan: user.plan } });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ email: req.user.email, plan: req.user.plan });
});

// ============================================================
// Usage tracking
// ============================================================
function checkUsage(user) {
  const limits = { free: 3, pro: Infinity };
  const limit = limits[user.plan] || 3;
  const used = user.summaries_used || 0;
  if (used >= limit) return { allowed: false, remaining: 0, limit };
  return { allowed: true, remaining: limit - used, limit };
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
  // Method 1: InnerTube player API (Android client — bypasses rate limits)
  try {
    const body = JSON.stringify({
      context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', hl: 'en', gl: 'US' } },
      videoId,
    });
    const responseText = await fetchUrl('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 11)',
      },
    });
    const data = JSON.parse(responseText);
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    const enTrack = tracks.find(t => t.languageCode === 'en') || tracks[0];

    if (enTrack?.baseUrl) {
      // Try json3 format first, fall back to srv3 XML parsing
      const transcriptUrl = enTrack.baseUrl + (enTrack.baseUrl.includes('?') ? '&' : '?') + 'fmt=json3';
      const transcriptRaw = await fetchUrl(transcriptUrl);
      let segments = [];
      
      if (transcriptRaw.trim().startsWith('{')) {
        // JSON3 format
        const parsed = JSON.parse(transcriptRaw);
        for (const event of (parsed.events || [])) {
          if (!event.segs) continue;
          const text = event.segs.map(s => s.utf8 || '').join('').trim();
          if (text && text !== '\n') {
            segments.push({ text, offset: event.tStartMs || 0, duration: event.dDurationMs || 0 });
          }
        }
      } else if (transcriptRaw.trim().startsWith('<')) {
        // srv3 XML format — YouTube sometimes returns this instead of JSON on cloud IPs
        const textMatches = [...transcriptRaw.matchAll(/<text[^>]*start="([\d.]+)"[^>]*(?:dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g)];
        for (const m of textMatches) {
          const rawText = m[3].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
          if (rawText) {
            segments.push({ text: rawText, offset: Math.floor(parseFloat(m[1]) * 1000), duration: Math.floor((parseFloat(m[2]) || 0) * 1000) });
          }
        }
      }
      
      if (segments.length > 0) return segments;
    }
  } catch (e) {
    console.log('InnerTube failed:', e.message);
  }

  // Method 2: youtube-transcript library
  try {
    const { YoutubeTranscript } = await import('youtube-transcript');
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    if (transcript?.length > 0) return transcript;
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
  return JSON.parse(clean);
}

// ============================================================
// MAIN ENDPOINT
// ============================================================
app.post('/api/summarize', auth, async (req, res) => {
  try {
    const usage = checkUsage(req.user);
    if (!usage.allowed) {
      return res.status(402).json({
        error: `You've used all ${usage.limit} free summaries for today. Upgrade to Pro for unlimited summaries.`,
        limitReached: true,
      });
    }

    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Please provide a YouTube URL.' });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: 'Could not parse YouTube URL.' });

    const transcript = await getTranscript(videoId);
    if (!transcript) {
      return res.status(400).json({
        error: "This video doesn't have English captions or subtitles available. Try a video with auto-generated or manual captions.",
      });
    }

    const durationMinutes = getDurationFromTranscript(transcript);

    if (durationMinutes > 15 && req.user.plan === 'free') {
      const meta = await getVideoMeta(videoId);
      return res.json({ proRequired: true, duration: durationMinutes, title: meta.title, channel: meta.channel, videoId });
    }

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

    incrementUsage(req.user.id);
    addSummary(req.user.id, videoId, meta.title);

    res.json({
      title: meta.title, channel: meta.channel, duration: durationMinutes, videoId,
      summary: summary.summary, takeaways: summary.takeaways, timestamps: summary.timestamps,
      remaining: usage.remaining - 1, limit: usage.limit,
    });
  } catch (err) {
    console.error('Summarize error:', err);
    res.status(500).json({ error: 'Something went wrong while summarizing.' });
  }
});

// ============================================================
// Usage, Leads, Stripe
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

// Stripe checkout — create session for Pro upgrade
app.post('/api/create-checkout-session', auth, async (req, res) => {
  if (!stripe || !STRIPE_PRICE_ID) {
    return res.json({ status: 'coming_soon' });
  }

  try {
    const origin = req.headers.origin || req.headers.referer || 'https://yepits.ai';
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

// Stripe config for frontend
app.get('/api/stripe-config', (req, res) => {
  res.json({ publishableKey: STRIPE_PUBLISHABLE_KEY, priceId: STRIPE_PRICE_ID });
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
  app.use(express.static(distPath));

  // Serve static legal pages before SPA catch-all
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
