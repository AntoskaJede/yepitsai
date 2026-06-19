import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import Stripe from 'stripe'
import Anthropic from '@anthropic-ai/sdk'
import Database from 'better-sqlite3'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Config ─────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'yepitsai-jwt-secret-2026'
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'yepitsai.db')
const FREE_DAILY_LIMIT = 3
const FREE_MAX_DURATION = 15 // minutes
const IP_DAILY_LIMIT = 5 // FIX #5: Prevent multi-account abuse
const PORT = process.env.PORT || 3001

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')

// ─── Database ───────────────────────────────────────────
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    stripe_customer_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS summaries (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    video_id TEXT,
    title TEXT,
    ip_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS ip_usage (
    ip_hash TEXT,
    date TEXT,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (ip_hash, date)
  );
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    email TEXT,
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_summaries_user ON summaries(user_id);
  CREATE INDEX IF NOT EXISTS idx_summaries_ip ON summaries(ip_hash);
`)

// ─── Helpers ────────────────────────────────────────────
function getIpHash(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16)
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function getUserDailyCount(userId) {
  const row = db.prepare('SELECT COUNT(*) as count FROM summaries WHERE user_id = ? AND date(created_at) = ?').get(userId, getToday())
  return row.count
}

function getIpDailyCount(ipHash) {
  const row = db.prepare('SELECT count FROM ip_usage WHERE ip_hash = ? AND date = ?').get(ipHash, getToday())
  return row?.count || 0
}

function incrementIpUsage(ipHash) {
  db.prepare('INSERT INTO ip_usage (ip_hash, date, count) VALUES (?, ?, 1) ON CONFLICT(ip_hash, date) DO UPDATE SET count = count + 1').run(ipHash, getToday())
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.user = jwt.verify(header.substring(7), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.substring(7), JWT_SECRET) } catch {}
  }
  next()
}

// ─── YouTube Transcript Fetch (via Jina proxy + direct fallback) ───
// ─── YouTube Transcript Fetch (youtube-transcript + Supadata fallback) ───
import { fetchTranscript as fetchYouTubeTranscript } from 'youtube-transcript'

const SUPADATA_KEY = process.env.SUPADATA_KEY || 'sd_8d77b7ef2a92dc8bd874f43b39cb041e'

async function fetchTranscript(videoId) {
  // Strategy 1: youtube-transcript package (primary)
  try {
    const segments = await fetchYouTubeTranscript(videoId, { lang: 'en' })
    if (segments && segments.length > 0) {
      // Get title from oEmbed
      let title = 'YouTube Video'
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
        if (oembedRes.ok) title = (await oembedRes.json()).title || title
      } catch {}

      return {
        title,
        durationMin: 0,
        transcript: segments.map(s => s.text || '').join(' '),
        segments: segments.map(s => ({ start: typeof s.start === 'number' ? s.start : 0, text: s.text || '' }))
      }
    }
  } catch (err) {
    console.log(`[transcript] youtube-transcript failed: ${err.message}, trying Supadata...`)
  }

  // Strategy 2: Supadata API (fallback)
  try {
    const res = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&lang=en`, {
      headers: { 'x-api-key': SUPADATA_KEY }
    })
    const data = await res.json()

    if (data.content && Array.isArray(data.content) && data.content.length > 0) {
      // Get title from oEmbed
      let title = 'YouTube Video'
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
        if (oembedRes.ok) title = (await oembedRes.json()).title || title
      } catch {}

      const segments = data.content.map((item, i) => ({
        start: typeof item.start === 'number' ? item.start : i * 5,
        text: item.text || ''
      }))

      return {
        title,
        durationMin: 0,
        transcript: segments.map(s => s.text).join(' '),
        segments
      }
    }
  } catch (err) {
    console.log(`[transcript] Supadata failed: ${err.message}`)
  }

  throw new Error('No captions available for this video')
}

// ─── AI Summary (Claude) ───────────────────────────────
async function generateSummary(transcript, title) {
  // Truncate to ~50k chars to stay within context limits
  const text = transcript.slice(0, 50000)

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `You are a helpful assistant that summarizes YouTube videos. Summarize this video transcript concisely.

Video title: ${title}

Transcript:
${text}

Provide your response as JSON with this structure:
{"summary": "2-3 paragraph summary of the main points","keyTakeaways": ["point 1", "point 2", "point 3", "point 4", "point 5"],"keyMoments": [{"time": "MM:SS", "seconds": 123, "label": "what happens at this point"}]}

Keep the summary concise and informative. Include 3-5 key takeaways and 3-6 key moments with timestamps.`
    }]
  })

  const content = response.content[0].text
  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to parse AI response')

  return JSON.parse(jsonMatch[0])
}

// ─── App Setup ─────────────────────────────────────────
const app = express()

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Serve static frontend (built by Vite)
const distPath = path.join(__dirname, 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
}

// ─── Routes ─────────────────────────────────────────────

// Health
app.get('/api/health', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) as c FROM users').get().c
  const proUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE plan = 'pro'").get().c
  const summaries = db.prepare('SELECT COUNT(*) as c FROM summaries').get().c
  const leads = db.prepare('SELECT COUNT(*) as c FROM leads').get().c
  res.json({ status: 'ok', users, proUsers, summaries, leads })
})

// FIX #4: Signup — proper validation + stores user
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, acceptTerms } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' })
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return res.status(400).json({ error: 'Please enter a valid email.' })
  if (/[<>]/.test(email)) return res.status(400).json({ error: 'Please enter a valid email.' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  if (password.length > 128) return res.status(400).json({ error: 'Password is too long.' })
  if (email.length > 255) return res.status(400).json({ error: 'Email is too long.' })
  if (!acceptTerms) return res.status(400).json({ error: 'Please accept the Terms and Privacy Policy to continue.' })

  const normalizedEmail = email.toLowerCase().trim()

  // Check if user exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail)
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' })

  const id = 'user_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex')
  const hash = bcrypt.hashSync(password, 10)

  db.prepare('INSERT INTO users (id, email, password_hash, plan) VALUES (?, ?, ?, ?)').run(id, normalizedEmail, hash, 'free')

  const token = jwt.sign({ email: normalizedEmail, id }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, user: { email: normalizedEmail, plan: 'free', id } })
})

// FIX #4: Login — proper password verification
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' })

  const normalizedEmail = email.toLowerCase().trim()
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail)
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' })

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  const token = jwt.sign({ email: user.email, id: user.id }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, user: { email: user.email, plan: user.plan, id: user.id } })
})

// Get current user
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT email, plan, id FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ user })
})

// Usage info
app.get('/api/usage', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'Not found' })

  if (user.plan === 'pro') return res.json({ remaining: -1, plan: 'pro', used: 0, limit: -1 })

  const used = getUserDailyCount(req.user.id)
  res.json({ remaining: Math.max(0, FREE_DAILY_LIMIT - used), plan: 'free', used, limit: FREE_DAILY_LIMIT })
})

// Summarize
app.post('/api/summarize', optionalAuth, async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'URL is required' })

  // Extract video ID
  const videoMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/)
  if (!videoMatch) return res.status(400).json({ error: 'Please paste a valid YouTube URL.' })
  const videoId = videoMatch[1]

  const ipHash = getIpHash(req)
  const isPro = req.user ? db.prepare('SELECT plan FROM users WHERE id = ?').get(req.user.id)?.plan === 'pro' : false

  // Check daily limit BEFORE fetching transcript (prevents over-usage)
  if (!isPro) {
    // IP-based check (applies to all free users + anonymous)
    const ipUsed = getIpDailyCount(ipHash)
    if (ipUsed >= IP_DAILY_LIMIT) {
      return res.status(429).json({
        error: "Daily free limit reached. Upgrade to Pro for unlimited summaries.",
        needsAuth: !req.user
      })
    }
    // Account-based check (for logged-in free users)
    if (req.user) {
      const used = getUserDailyCount(req.user.id)
      if (used >= FREE_DAILY_LIMIT) {
        return res.status(429).json({
          error: "You've used all your free summaries for today. Upgrade to Pro for unlimited access.",
          remaining: 0
        })
      }
    }
  }

  try {
    // Fetch transcript
    const { title, durationMin, transcript } = await fetchTranscript(videoId)

    // Check duration for free users
    if (!isPro && durationMin > FREE_MAX_DURATION) {
      return res.status(403).json({ tooLong: true, duration: durationMin })
    }

    // Generate summary
    const result = await generateSummary(transcript, title)

    // Record usage
    const summaryId = 'sum_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex')
    db.prepare('INSERT INTO summaries (id, user_id, video_id, title, ip_hash) VALUES (?, ?, ?, ?, ?)').run(
      summaryId, req.user?.id || null, videoId, title, ipHash
    )
    incrementIpUsage(ipHash)

    // Calculate remaining
    let remaining = undefined
    if (!isPro && req.user) {
      remaining = Math.max(0, FREE_DAILY_LIMIT - getUserDailyCount(req.user.id))
    } else if (!isPro && !req.user) {
      remaining = Math.max(0, IP_DAILY_LIMIT - getIpDailyCount(ipHash))
    }

    res.json({
      videoId,
      title,
      summary: result.summary,
      takeaways: result.keyTakeaways || [],
      keyTakeaways: result.keyTakeaways || [],
      timestamps: result.keyMoments || [],
      keyMoments: result.keyMoments || [],
      remaining,
      limit: isPro ? -1 : FREE_DAILY_LIMIT
    })
  } catch (err) {
    console.error('Summarize error:', err.message)
    if (err.message.includes('No captions') || err.message.includes('transcript')) {
      res.status(400).json({ error: 'Could not get transcript for this video. It may not have subtitles.' })
    } else {
      res.status(500).json({ error: 'Something went wrong. Try a different video.' })
    }
  }
})

// Stripe checkout
app.post('/api/create-checkout-session', authMiddleware, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  try {
    let customerId = user.stripe_customer_id

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id }
      })
      customerId = customer.id
      db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, user.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID || 'price_1Tj0iSCzKU30REROmJkuWiKQ', quantity: 1 }],
      success_url: 'https://yepits.ai?upgraded=1',
      cancel_url: 'https://yepits.ai',
      metadata: { userId: user.id }
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('Stripe error:', err.message)
    res.status(500).json({ error: 'Could not start checkout.' })
  }
})

// Stripe webhook
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature']
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.metadata?.userId
      if (userId) {
        db.prepare("UPDATE users SET plan = 'pro' WHERE id = ?").run(userId)
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const customerId = subscription.customer
      db.prepare("UPDATE users SET plan = 'free' WHERE stripe_customer_id = ?").run(customerId)
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err.message)
    res.status(400).send(`Webhook Error: ${err.message}`)
  }
})

// Leads
app.post('/api/leads', (req, res) => {
  const { email, source } = req.body
  if (!email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return res.status(400).json({ error: 'Invalid email' })
  const id = 'lead_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex')
  db.prepare('INSERT INTO leads (id, email, source) VALUES (?, ?, ?)').run(id, email.toLowerCase().trim(), source || 'unknown')
  res.json({ ok: true })
})

// Forgot password (basic — logs the request, returns success)
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })
  // Check if user exists but don't reveal
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim())
  // Always return success (don't leak which emails exist)
  res.json({ ok: true, message: 'If an account exists, you will receive a reset email.' })
})

// Delete account
app.delete('/api/auth/delete', authMiddleware, (req, res) => {
  const userId = req.user.id
  // Delete user data
  db.prepare('DELETE FROM summaries WHERE user_id = ?').run(userId)
  db.prepare('DELETE FROM users WHERE id = ?').run(userId)
  res.json({ ok: true })
})

// Catch-all for SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not found' })
  } else if (fs.existsSync(distPath)) {
    res.sendFile(path.join(distPath, 'index.html'))
  } else {
    res.status(404).send('Not found')
  }
})

app.listen(PORT, () => {
  console.log(`YepIts.ai server running on port ${PORT}`)
})
