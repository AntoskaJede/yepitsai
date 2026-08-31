import Database from 'better-sqlite3';

const db = new Database('/data/yepitsai.db', { verbose: null });

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

  -- Per-user blog generation history. user_id is nullable so the table
  -- can also store anonymous generations if we ever choose to (we don't
  -- write anon rows today — mirrors the summaries table convention where
  -- only authenticated users persist history).
  CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    video_id TEXT NOT NULL,
    title TEXT,
    blog_json TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_blog_posts_video_created
    ON blog_posts (video_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_blog_posts_user_created
    ON blog_posts (user_id, created_at DESC);
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
// Blog post history (per-user audit trail of generated blogs)
// ============================================================
export function addBlogPost({ userId, videoId, title, blogPost }) {
  db.prepare(
    'INSERT INTO blog_posts (user_id, video_id, title, blog_json) VALUES (?, ?, ?, ?)'
  ).run(userId || null, videoId, title || null, JSON.stringify(blogPost));
}

export function listBlogPostsForUser(userId, limit = 50) {
  return db.prepare(
    'SELECT id, video_id, title, created_at FROM blog_posts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(userId, limit);
}

export function getBlogPost(id, userId) {
  return db.prepare(
    'SELECT * FROM blog_posts WHERE id = ? AND user_id = ?'
  ).get(id, userId);
}

export function countBlogPosts() {
  return db.prepare('SELECT COUNT(*) as count FROM blog_posts').get().count;
}

export { db };
