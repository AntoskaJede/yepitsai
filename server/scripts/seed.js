#!/usr/bin/env node
// ============================================================
// Seed public summary pages.
//
//   node scripts/seed.js --playlist "https://www.youtube.com/playlist?list=..." [--limit 50]
//   node scripts/seed.js --urls urls.txt
//   node scripts/seed.js https://youtu.be/abc https://youtu.be/def
//
// Options: --base https://yepits.ai (default) · --token <ADMIN_TOKEN>
//          (or ADMIN_TOKEN env / server/.env) · --delay 4000 (ms between calls)
//          --dry (list videos only, don't summarize)
//
// It calls the live /api/summarize with the admin token, which bypasses the
// free-tier quota and length limit. Each successful summary becomes a
// public page at /s/<videoId>. Already-summarized videos are cheap (cache).
// ============================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i !== -1 ? args[i + 1] : dflt; };
const flag = (name) => args.includes(`--${name}`);

function loadEnvToken() {
  if (process.env.ADMIN_TOKEN) return process.env.ADMIN_TOKEN;
  try {
    const env = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
    const m = env.match(/^ADMIN_TOKEN=(.+)$/m);
    return m ? m[1].trim() : '';
  } catch { return ''; }
}

const BASE = (opt('base', 'https://yepits.ai')).replace(/\/$/, '');
const TOKEN = opt('token', loadEnvToken());
const LIMIT = parseInt(opt('limit', '100'), 10);
const DELAY = parseInt(opt('delay', '4000'), 10);
const DRY = flag('dry');

function extractVideoId(url) {
  const m = String(url).match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/) || String(url).match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : null;
}

function findAll(obj, key, out = []) {
  if (!obj || typeof obj !== 'object') return out;
  if (Array.isArray(obj)) { for (const v of obj) findAll(v, key, out); return out; }
  if (key in obj) out.push(obj[key]);
  for (const v of Object.values(obj)) findAll(v, key, out);
  return out;
}

// Expand a playlist via InnerTube browse (same endpoint the site's transcript
// fetcher uses). Follows continuations up to `limit` videos.
async function expandPlaylist(url, limit) {
  const m = String(url).match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (!m) throw new Error('No list= parameter in playlist URL');
  const playlistId = m[1];
  const context = { client: { clientName: 'WEB', clientVersion: '2.20241201.00.00', hl: 'en', gl: 'US' } };
  const headers = { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' };
  const ids = [];
  const seen = new Set();
  let body = { context, browseId: `VL${playlistId}` };
  for (let hop = 0; hop < 20 && ids.length < limit; hop++) {
    const res = await fetch('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`InnerTube browse failed: ${res.status}`);
    const data = await res.json();
    // Older layout: playlistVideoRenderer. Current layout (2025+): lockupViewModel
    // with contentId + contentType 'LOCKUP_CONTENT_TYPE_VIDEO'.
    for (const r of findAll(data, 'playlistVideoRenderer')) {
      if (r?.videoId && !seen.has(r.videoId)) { seen.add(r.videoId); ids.push({ id: r.videoId, title: r.title?.runs?.[0]?.text || '' }); }
    }
    for (const r of findAll(data, 'lockupViewModel')) {
      const id = r?.contentId;
      const isVideo = !r?.contentType || /VIDEO/.test(r.contentType);
      if (isVideo && /^[A-Za-z0-9_-]{11}$/.test(id || '') && !seen.has(id)) {
        seen.add(id);
        ids.push({ id, title: r?.metadata?.lockupMetadataViewModel?.title?.content || '' });
      }
    }
    const token = findAll(data, 'continuationCommand').map(c => c?.token).find(Boolean);
    if (!token) break;
    body = { context, continuation: token };
  }
  return ids.slice(0, limit);
}

async function summarize(videoId) {
  const res = await fetch(`${BASE}/api/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': TOKEN, 'User-Agent': 'yepits-seed/1.0' },
    body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}` }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  if (data.proRequired) throw new Error(`too long (${data.duration} min)`);
  if (!data.summary) throw new Error('empty summary');
  return data;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  let videos = [];
  const playlist = opt('playlist');
  const urlsFile = opt('urls');
  if (playlist) {
    console.log(`Expanding playlist…`);
    videos = await expandPlaylist(playlist, LIMIT);
  } else if (urlsFile) {
    videos = fs.readFileSync(urlsFile, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#')).map(u => ({ id: extractVideoId(u), title: '' })).filter(v => v.id);
  } else {
    videos = args.filter(a => !a.startsWith('--') && extractVideoId(a)).map(u => ({ id: extractVideoId(u), title: '' }));
  }
  if (!videos.length) { console.error('No videos found. See usage at the top of this file.'); process.exit(1); }
  console.log(`${videos.length} videos. Target: ${BASE}${DRY ? ' (dry run)' : ''}`);
  if (DRY) { videos.forEach(v => console.log(`  ${v.id}  ${v.title}`)); return; }
  if (!TOKEN) { console.error('No ADMIN_TOKEN. Pass --token or set it in server/.env'); process.exit(1); }

  let ok = 0, fail = 0;
  for (const [i, v] of videos.entries()) {
    process.stdout.write(`[${i + 1}/${videos.length}] ${v.id} ${v.title.slice(0, 50)} … `);
    try {
      const d = await summarize(v.id);
      ok++;
      console.log(`${d.cached ? 'cached' : 'ok'} → ${BASE}/s/${v.id}`);
    } catch (err) {
      fail++;
      console.log(`skip: ${err.message}`);
    }
    if (i < videos.length - 1) await sleep(DELAY);
  }
  console.log(`\nDone. ${ok} pages, ${fail} skipped. Sitemap: ${BASE}/sitemap.xml`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
