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
`);

export function createUser({ id, email, passwordHash }) {
  db.prepare('INSERT INTO users (id, email, password_hash, summaries_reset_at) VALUES (?, ?, ?, ?)').run(
    id, email, passwordHash, Date.now() + 24 * 60 * 60 * 1000
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

export function getStats() {
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const leads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
  const summaries = db.prepare('SELECT COUNT(*) as count FROM summaries').get().count;
  const proUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'pro'").get().count;
  return { users, leads, summaries, proUsers };
}

export { db };
