import Database from 'better-sqlite3';

import fs from 'fs';
import path from 'path';

// Railway mounts a persistent volume at /data. Override for local dev
// (macOS has no writable /data) with DB_PATH=./data/yepitsai.db.
const DB_PATH = process.env.DB_PATH || '/data/yepitsai.db';
try { fs.mkdirSync(path.dirname(DB_PATH), { recursive: true }); } catch {}
const db = new Database(DB_PATH, { verbose: null });

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    summaries_used INTEGER DEFAULT 0,
    summaries_reset_at INTEGER DEFAULT 0,
    email_verified INTEGER DEFAULT 0,
    verify_token TEXT,
    reset_token TEXT,
    reset_expires INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    source TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    video_title TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Summary cache (so popular videos don't re-summarize on every request).
  -- Survives redeploys. videoId is unique.
  CREATE TABLE IF NOT EXISTS summary_cache (
    video_id TEXT PRIMARY KEY,
    title TEXT,
    channel TEXT,
    duration INTEGER,
    summary TEXT NOT NULL,
    takeaways TEXT NOT NULL,  -- JSON array
    timestamps TEXT NOT NULL, -- JSON array
    cached_at INTEGER NOT NULL
  );

  -- Anonymous usage tracking (per-IP) so the 3/day free limit survives restarts.
  -- Same reset schedule as authenticated users (every 24h).
  CREATE TABLE IF NOT EXISTS anon_usage (
    ip TEXT PRIMARY KEY,
    summaries_used INTEGER NOT NULL DEFAULT 0,
    summaries_reset_at INTEGER NOT NULL DEFAULT 0
  );
`);

// Add columns if they don't exist (for existing DBs)
try { db.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN verify_token TEXT'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN reset_token TEXT'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN reset_expires INTEGER'); } catch {}

export function createUser({ id, email, passwordHash, verifyToken }) {
  db.prepare('INSERT INTO users (id, email, password_hash, summaries_reset_at, verify_token) VALUES (?, ?, ?, ?, ?)').run(
    id, email, passwordHash, Date.now() + 24 * 60 * 60 * 1000, verifyToken
  );
  return getUserByEmail(email);
}

export function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function updateUserPlan(userId, plan, stripeCustomerId, stripeSubscriptionId) {
  db.prepare(`
    UPDATE users SET plan = ?, stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?
  `).run(plan, stripeCustomerId, stripeSubscriptionId, userId);
}

export function incrementUsage(userId) {
  db.prepare('UPDATE users SET summaries_used = summaries_used + 1 WHERE id = ?').run(userId);
}

export function resetUsageIfNeeded(user) {
  if (Date.now() > user.summaries_reset_at) {
    const nextReset = Date.now() + 24 * 60 * 60 * 1000;
    db.prepare('UPDATE users SET summaries_used = 0, summaries_reset_at = ? WHERE id = ?').run(nextReset, user.id);
    return { ...user, summaries_used: 0, summaries_reset_at: nextReset };
  }
  return user;
}

export function addLead(email, source) {
  const existing = db.prepare('SELECT id FROM leads WHERE email = ?').get(email);
  if (!existing) {
    db.prepare('INSERT INTO leads (email, source) VALUES (?, ?)').run(email, source);
  }
}

export function addSummary(userId, videoId, videoTitle) {
  db.prepare('INSERT INTO summaries (user_id, video_id, video_title) VALUES (?, ?, ?)').run(userId, videoId, videoTitle);
}

// ============================================================
// Summary cache (SQLite-backed, survives redeploys)
// ============================================================
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getCachedSummary(videoId) {
  const row = db.prepare('SELECT * FROM summary_cache WHERE video_id = ?').get(videoId);
  if (!row) return null;
  if (Date.now() - row.cached_at > CACHE_TTL_MS) {
    db.prepare('DELETE FROM summary_cache WHERE video_id = ?').run(videoId);
    return null;
  }
  return {
    title: row.title,
    channel: row.channel,
    duration: row.duration,
    summary: row.summary,
    takeaways: JSON.parse(row.takeaways),
    timestamps: JSON.parse(row.timestamps),
  };
}

export function setCachedSummary(videoId, data) {
  db.prepare(`
    INSERT INTO summary_cache (video_id, title, channel, duration, summary, takeaways, timestamps, cached_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(video_id) DO UPDATE SET
      title = excluded.title,
      channel = excluded.channel,
      duration = excluded.duration,
      summary = excluded.summary,
      takeaways = excluded.takeaways,
      timestamps = excluded.timestamps,
      cached_at = excluded.cached_at
  `).run(
    videoId,
    data.title || null,
    data.channel || null,
    data.duration || null,
    data.summary,
    JSON.stringify(data.takeaways || []),
    JSON.stringify(data.timestamps || []),
    Date.now()
  );
}

// ============================================================
// Anonymous usage tracking (per-IP) — survives redeploys
// ============================================================
const ANON_RESET_MS = 24 * 60 * 60 * 1000; // 24h

export function getAnonUsage(ip) {
  const row = db.prepare('SELECT * FROM anon_usage WHERE ip = ?').get(ip);
  if (!row) return { summaries_used: 0, summaries_reset_at: Date.now() + ANON_RESET_MS };
  if (Date.now() > row.summaries_reset_at) {
    const nextReset = Date.now() + ANON_RESET_MS;
    db.prepare('UPDATE anon_usage SET summaries_used = 0, summaries_reset_at = ? WHERE ip = ?').run(nextReset, ip);
    return { summaries_used: 0, summaries_reset_at: nextReset };
  }
  return { summaries_used: row.summaries_used, summaries_reset_at: row.summaries_reset_at };
}

export function incrementAnonUsage(ip) {
  // Ensure row exists first (INSERT OR IGNORE is idempotent)
  db.prepare('INSERT OR IGNORE INTO anon_usage (ip, summaries_used, summaries_reset_at) VALUES (?, 0, ?)').run(ip, Date.now() + ANON_RESET_MS);
  db.prepare('UPDATE anon_usage SET summaries_used = summaries_used + 1 WHERE ip = ?').run(ip);
}

export function getStats() {
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const leads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
  const summaries = db.prepare('SELECT COUNT(*) as count FROM summaries').get().count;
  const proUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'pro'").get().count;
  return { users, leads, summaries, proUsers };
}

// ============================================================
// Analytics: events table + first-touch attribution on users
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    type TEXT NOT NULL,
    path TEXT,
    referrer TEXT,
    ref_host TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    visitor TEXT,
    user_id TEXT,
    video_id TEXT,
    plan TEXT,
    meta TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
  CREATE INDEX IF NOT EXISTS idx_events_type_ts ON events(type, ts);
`);
try { db.exec('ALTER TABLE users ADD COLUMN attribution TEXT'); } catch {}

const insertEvent = db.prepare(`
  INSERT INTO events (ts, type, path, referrer, ref_host, utm_source, utm_medium, utm_campaign, utm_content, visitor, user_id, video_id, plan, meta)
  VALUES (@ts, @type, @path, @referrer, @ref_host, @utm_source, @utm_medium, @utm_campaign, @utm_content, @visitor, @user_id, @video_id, @plan, @meta)
`);

export function logEvent(e) {
  insertEvent.run({
    ts: Date.now(), type: e.type,
    path: e.path ?? null, referrer: e.referrer ?? null, ref_host: e.ref_host ?? null,
    utm_source: e.utm_source ?? null, utm_medium: e.utm_medium ?? null,
    utm_campaign: e.utm_campaign ?? null, utm_content: e.utm_content ?? null,
    visitor: e.visitor ?? null, user_id: e.user_id ?? null, video_id: e.video_id ?? null,
    plan: e.plan ?? null, meta: e.meta ?? null,
  });
}

export function setUserAttribution(userId, attribution) {
  if (!attribution) return;
  db.prepare('UPDATE users SET attribution = ? WHERE id = ? AND attribution IS NULL')
    .run(JSON.stringify(attribution), userId);
}

// Aggregates for /api/stats and /stats. "source" is first-touch:
// utm_source if present, else the external referrer host, else "direct".
export function getAnalytics(days = 30) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const SRC = `COALESCE(NULLIF(utm_source, ''), NULLIF(ref_host, ''), 'direct')`;
  const DAY = `date(ts / 1000, 'unixepoch')`;

  const funnel = db.prepare(`
    SELECT
      COUNT(DISTINCT CASE WHEN type = 'pageview' THEN visitor END) AS visitors,
      SUM(type = 'pageview') AS pageviews,
      SUM(type = 'summary') AS summaries,
      COUNT(DISTINCT CASE WHEN type = 'summary' THEN visitor END) AS summary_visitors,
      SUM(type = 'signup') AS signups,
      SUM(type = 'checkout_started') AS checkouts,
      SUM(type = 'pro_upgraded') AS upgrades,
      SUM(type = 'summary_limit') AS limit_hits,
      SUM(type = 'summary_too_long') AS too_long,
      SUM(type = 'summary_no_captions') AS no_captions
    FROM events WHERE ts >= ?
  `).get(since);
  for (const k of Object.keys(funnel)) funnel[k] = funnel[k] || 0;

  const daily = db.prepare(`
    SELECT ${DAY} AS day,
      COUNT(DISTINCT CASE WHEN type = 'pageview' THEN visitor END) AS visitors,
      SUM(type = 'pageview') AS pageviews,
      SUM(type = 'summary') AS summaries,
      SUM(type = 'signup') AS signups,
      SUM(type = 'pro_upgraded') AS upgrades
    FROM events WHERE ts >= ? GROUP BY day ORDER BY day DESC
  `).all(since);

  const sources = db.prepare(`
    SELECT ${SRC} AS source,
      COUNT(DISTINCT CASE WHEN type = 'pageview' THEN visitor END) AS visitors,
      SUM(type = 'summary') AS summaries,
      SUM(type = 'signup') AS signups,
      SUM(type = 'pro_upgraded') AS upgrades
    FROM events WHERE ts >= ? GROUP BY source ORDER BY visitors DESC, summaries DESC LIMIT 50
  `).all(since);

  const pages = db.prepare(`
    SELECT path, COUNT(*) AS pageviews, COUNT(DISTINCT visitor) AS visitors
    FROM events WHERE ts >= ? AND type = 'pageview' AND path IS NOT NULL
    GROUP BY path ORDER BY pageviews DESC LIMIT 50
  `).all(since);

  const referrers = db.prepare(`
    SELECT ref_host, COUNT(DISTINCT visitor) AS visitors
    FROM events WHERE ts >= ? AND type = 'pageview' AND ref_host IS NOT NULL
    GROUP BY ref_host ORDER BY visitors DESC LIMIT 50
  `).all(since);

  const recent_summaries = db.prepare(`
    SELECT datetime(ts / 1000, 'unixepoch') AS ts, video_id, plan, ${SRC} AS source
    FROM events WHERE type = 'summary' ORDER BY ts DESC LIMIT 25
  `).all();

  return { days, since, funnel, daily, sources, pages, referrers, recent_summaries };
}

// ============================================================
// Public summary pages (/s/<videoId>) — permanent, unlike summary_cache
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS public_summaries (
    video_id TEXT PRIMARY KEY,
    slug TEXT,
    title TEXT,
    channel TEXT,
    duration INTEGER,
    summary TEXT NOT NULL,
    takeaways TEXT NOT NULL,
    timestamps TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_public_summaries_created ON public_summaries(created_at);
`);

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'video';
}

export function upsertPublicSummary(videoId, data) {
  if (!data?.summary) return;
  const now = Date.now();
  db.prepare(`
    INSERT INTO public_summaries (video_id, slug, title, channel, duration, summary, takeaways, timestamps, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(video_id) DO UPDATE SET
      slug = excluded.slug, title = excluded.title, channel = excluded.channel, duration = excluded.duration,
      summary = excluded.summary, takeaways = excluded.takeaways, timestamps = excluded.timestamps,
      updated_at = excluded.updated_at
  `).run(
    videoId, slugify(data.title), data.title || null, data.channel || null, data.duration || null,
    data.summary, JSON.stringify(data.takeaways || []), JSON.stringify(data.timestamps || []), now, now
  );
}

function rowToSummary(row) {
  if (!row) return null;
  return { ...row, takeaways: JSON.parse(row.takeaways || '[]'), timestamps: JSON.parse(row.timestamps || '[]') };
}

export function getPublicSummary(videoId) {
  return rowToSummary(db.prepare('SELECT * FROM public_summaries WHERE video_id = ?').get(videoId));
}

export function incrementSummaryViews(videoId) {
  db.prepare('UPDATE public_summaries SET views = views + 1 WHERE video_id = ?').run(videoId);
}

export function listPublicSummaries({ limit = 24, offset = 0 } = {}) {
  return db.prepare('SELECT video_id, slug, title, channel, duration, views, created_at, updated_at, substr(summary, 1, 220) AS excerpt FROM public_summaries ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
}

export function countPublicSummaries() {
  return db.prepare('SELECT COUNT(*) AS c FROM public_summaries').get().c;
}

export function allPublicSummaryUrls() {
  return db.prepare('SELECT video_id, slug, updated_at FROM public_summaries ORDER BY created_at DESC LIMIT 45000').all();
}

export { db };
