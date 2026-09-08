// ============================================================
// First-party analytics: pageviews, UTM attribution, funnel events.
//
// Why this exists: we had no way to know whether anyone visited the
// site, let alone which channel brought them. This is a zero-dependency
// server-side layer: a first-party visitor cookie, first-touch UTM
// attribution, and an `events` table in SQLite. No third-party script,
// no cross-site tracking.
//
// Surface:
//   POST /api/track        — frontend beacon (pageview / view events)
//   GET  /api/stats?days=N — JSON aggregates, requires ADMIN_TOKEN
//   GET  /stats?token=...  — tiny HTML dashboard over the same data
//   req.track(type, meta)  — attached to every request by trackMiddleware
// ============================================================
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { logEvent, getAnalytics } from './db.js';

const VISITOR_COOKIE = 'yi_vid';
const ATTR_COOKIE = 'yi_attr';
const ONE_YEAR = 365 * 24 * 60 * 60;
const THIRTY_DAYS = 30 * 24 * 60 * 60;
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pingdom|monitor|curl|wget|python-requests/i;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function setCookie(res, name, value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly${secure}`;
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, cookie) : cookie);
}

function refHost(referrer) {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    return host || null;
  } catch { return null; }
}

function isInternal(host) {
  if (!host) return false;
  return host === 'yepits.ai' || host === 'localhost' || host.endsWith('.yepits.ai');
}

// Attribution = first-touch. Once a visitor has a source, we keep it for
// 30 days so a Reddit visitor who comes back via Google still counts for
// Reddit. Only fields that are present are stored.
function extractAttribution({ query = {}, referrer, path }) {
  const attr = {};
  for (const k of UTM_KEYS) if (query[k]) attr[k] = String(query[k]).slice(0, 100);
  const host = refHost(referrer);
  if (host && !isInternal(host)) attr.ref_host = host;
  if (path) attr.landing = String(path).slice(0, 200);
  if (Object.keys(attr).length === 0) return null;
  attr.first_seen = Date.now();
  return attr;
}

function fallbackVisitorId(req) {
  const ua = req.headers['user-agent'] || '';
  const ip = req.ip || '';
  const salt = process.env.JWT_SECRET || 'yepits';
  return 'h_' + crypto.createHash('sha256').update(`${ip}|${ua}|${salt}`).digest('hex').slice(0, 24);
}

// Attaches req.visitor, req.attribution, req.track(). Never throws:
// analytics must not break the product.
export function trackMiddleware(req, res, next) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    req.visitor = cookies[VISITOR_COOKIE] || null;
    req.visitorFromCookie = !!req.visitor;
    if (!req.visitor) req.visitor = fallbackVisitorId(req);

    let attribution = null;
    if (cookies[ATTR_COOKIE]) {
      try { attribution = JSON.parse(cookies[ATTR_COOKIE]); } catch { attribution = null; }
    }
    req.attribution = attribution;
    req.isBot = BOT_RE.test(req.headers['user-agent'] || '');

    req.track = (type, meta = {}) => {
      try {
        if (req.isBot) return;
        const a = req.attribution || {};
        logEvent({
          type,
          path: meta.path ?? null,
          referrer: meta.referrer ?? null,
          ref_host: meta.ref_host ?? a.ref_host ?? null,
          utm_source: meta.utm_source ?? a.utm_source ?? null,
          utm_medium: meta.utm_medium ?? a.utm_medium ?? null,
          utm_campaign: meta.utm_campaign ?? a.utm_campaign ?? null,
          utm_content: meta.utm_content ?? a.utm_content ?? null,
          visitor: req.visitor,
          user_id: req.user && !String(req.user.id).startsWith('anon_') ? req.user.id : (meta.user_id ?? null),
          video_id: meta.video_id ?? null,
          plan: meta.plan ?? (req.user?.plan ?? null),
          meta: meta.extra ? JSON.stringify(meta.extra).slice(0, 1000) : null,
        });
      } catch (err) {
        console.error('[analytics] track failed:', err.message);
      }
    };
  } catch (err) {
    console.error('[analytics] middleware failed:', err.message);
    req.track = () => {};
  }
  next();
}

const trackLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

function checkAdmin(req) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return { ok: false, status: 503, error: 'ADMIN_TOKEN is not set on the server.' };
  const given = req.headers['x-admin-token'] || req.query.token || '';
  const a = Buffer.from(String(given));
  const b = Buffer.from(expected);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return ok ? { ok: true } : { ok: false, status: 401, error: 'Unauthorized' };
}

function clampDays(v) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return 30;
  return Math.min(365, Math.max(1, n));
}

export function mountAnalyticsRoutes(app) {
  // Frontend beacon. Sets the visitor cookie on first contact and locks in
  // first-touch attribution from the URL the visitor landed on.
  app.post('/api/track', trackLimiter, (req, res) => {
    try {
      const { type = 'pageview', path, referrer, utm = {}, extra } = req.body || {};
      if (!['pageview', 'view', 'click'].includes(type)) return res.status(400).json({ error: 'bad type' });

      if (!req.visitorFromCookie) {
        req.visitor = 'v_' + crypto.randomBytes(12).toString('hex');
        setCookie(res, VISITOR_COOKIE, req.visitor, ONE_YEAR);
      }
      if (!req.attribution) {
        const attr = extractAttribution({ query: utm, referrer, path });
        if (attr) {
          req.attribution = attr;
          setCookie(res, ATTR_COOKIE, JSON.stringify(attr), THIRTY_DAYS);
        }
      }
      const host = refHost(referrer);
      req.track(type, {
        path: path ? String(path).slice(0, 200) : null,
        referrer: referrer ? String(referrer).slice(0, 500) : null,
        ref_host: host && !isInternal(host) ? host : undefined,
        utm_source: utm.utm_source, utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign, utm_content: utm.utm_content,
        extra,
      });
      res.status(204).end();
    } catch (err) {
      console.error('[analytics] /api/track failed:', err.message);
      res.status(204).end();
    }
  });

  app.get('/api/stats', (req, res) => {
    const gate = checkAdmin(req);
    if (!gate.ok) return res.status(gate.status).json({ error: gate.error });
    res.json(getAnalytics(clampDays(req.query.days)));
  });

  app.get('/stats', (req, res) => {
    const gate = checkAdmin(req);
    if (!gate.ok) return res.status(gate.status).send(`<p style="font-family:sans-serif">${gate.error}</p>`);
    const days = clampDays(req.query.days);
    res.type('html').send(renderDashboard(getAnalytics(days), days, req.query.token));
  });
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function table(rows, cols) {
  if (!rows.length) return '<p class="muted">Nothing yet.</p>';
  const head = cols.map(c => `<th>${esc(c.label)}</th>`).join('');
  const body = rows.map(r => `<tr>${cols.map(c => `<td>${esc(r[c.key])}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderDashboard(a, days, token) {
  const f = a.funnel;
  const pct = (n, d) => d ? `${Math.round((n / d) * 100)}%` : '–';
  const links = [7, 30, 90].map(d => `<a href="/stats?days=${d}&token=${encodeURIComponent(token)}"${d === days ? ' class="on"' : ''}>${d}d</a>`).join(' ');
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>YepIts stats · ${days}d</title>
<style>
body{font:14px/1.5 -apple-system,system-ui,sans-serif;background:#FAF6F0;color:#1a1a1a;margin:0;padding:24px;max-width:1100px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:28px 0 8px;text-transform:uppercase;letter-spacing:.04em;color:#666}
.muted{color:#999}.nav a{margin-right:10px;color:#FF4F00}.nav a.on{font-weight:700;text-decoration:none}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:12px}
.tile{background:#fff;border:2px solid #1a1a1a;box-shadow:4px 4px 0 #FF4F00;padding:12px}
.tile b{display:block;font-size:26px}.tile span{color:#666;font-size:12px}
table{border-collapse:collapse;width:100%;background:#fff;border:2px solid #1a1a1a}
th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #eee;font-variant-numeric:tabular-nums}th{background:#F0EBE3}
.wrap{overflow-x:auto}
</style>
<h1>YepIts.ai · last ${days} days</h1>
<div class="nav">${links} <span class="muted">· generated ${esc(new Date().toISOString().slice(0, 16).replace('T', ' '))} UTC</span></div>
<div class="tiles">
  <div class="tile"><b>${f.visitors}</b><span>unique visitors</span></div>
  <div class="tile"><b>${f.pageviews}</b><span>pageviews</span></div>
  <div class="tile"><b>${f.summaries}</b><span>summaries <small>(${f.summary_visitors} people, ${pct(f.summary_visitors, f.visitors)})</small></span></div>
  <div class="tile"><b>${f.signups}</b><span>signups (${pct(f.signups, f.visitors)})</span></div>
  <div class="tile"><b>${f.checkouts}</b><span>checkout started</span></div>
  <div class="tile"><b>${f.upgrades}</b><span>Pro upgrades</span></div>
  <div class="tile"><b>${f.limit_hits}</b><span>hit free limit</span></div>
  <div class="tile"><b>${f.too_long}</b><span>video too long</span></div>
</div>
<h2>By source (first touch)</h2><div class="wrap">${table(a.sources, [
    { key: 'source', label: 'Source' }, { key: 'visitors', label: 'Visitors' }, { key: 'summaries', label: 'Summaries' },
    { key: 'signups', label: 'Signups' }, { key: 'upgrades', label: 'Upgrades' }])}</div>
<h2>By day</h2><div class="wrap">${table(a.daily, [
    { key: 'day', label: 'Day' }, { key: 'visitors', label: 'Visitors' }, { key: 'pageviews', label: 'Pageviews' },
    { key: 'summaries', label: 'Summaries' }, { key: 'signups', label: 'Signups' }, { key: 'upgrades', label: 'Upgrades' }])}</div>
<h2>Landing pages</h2><div class="wrap">${table(a.pages, [{ key: 'path', label: 'Path' }, { key: 'pageviews', label: 'Pageviews' }, { key: 'visitors', label: 'Visitors' }])}</div>
<h2>Referrers</h2><div class="wrap">${table(a.referrers, [{ key: 'ref_host', label: 'Host' }, { key: 'visitors', label: 'Visitors' }])}</div>
<h2>Recent summaries</h2><div class="wrap">${table(a.recent_summaries, [{ key: 'ts', label: 'When (UTC)' }, { key: 'video_id', label: 'Video' }, { key: 'plan', label: 'Plan' }, { key: 'source', label: 'Source' }])}</div>
<p class="muted" style="margin-top:32px">JSON: <code>/api/stats?days=${days}</code> with header <code>x-admin-token</code>.</p>`;
}
