// ============================================================
// Server-rendered public pages.
//
//   GET /s/:videoId(/:slug)  — permanent public summary page
//   GET /summaries           — paginated index of all public summaries
//   GET /sitemap.xml         — static URLs + every public summary
//
// These are plain HTML on purpose: the React app can't give Google or a
// social preview a per-video title, description, or image. Each page is a
// landing page for "<video title> summary" searches and ends in a CTA.
// ============================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getPublicSummary, incrementSummaryViews, listPublicSummaries,
  countPublicSummaries, allPublicSummaryUrls,
} from './db.js';
import { ensureVisitor, externalRefHost } from './analytics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = process.env.APP_URL && process.env.NODE_ENV === 'production' ? process.env.APP_URL : 'https://yepits.ai';
const PAGE_SIZE = 24;

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtDuration(min) {
  if (!min) return '';
  const m = Math.round(min);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}
function readTime(s) {
  const words = String(s || '').split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}
function fmtDate(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}
function trackPage(req, res) {
  try {
    ensureVisitor(req, res, { query: req.query, referrer: req.headers.referer, path: req.path });
    req.track('pageview', { path: req.path, referrer: req.headers.referer || null, ref_host: externalRefHost(req.headers.referer) || undefined });
  } catch {}
}

const CSS = `
:root{--cream:#FAF6F0;--cream2:#F5EFE6;--cream3:#F0EBE3;--clay:#FF4F00;--clay-soft:#FFE8DD;--ink:#1a1a1a;--muted:#666;--faint:#999;--border:#E8E0D4}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--cream);color:var(--ink);font-family:'Bricolage Grotesque',system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6}
a{color:inherit}
.wrap{max-width:720px;margin:0 auto;padding:0 20px}
header{border-bottom:2px solid var(--cream3)}
.nav{display:flex;align-items:center;justify-content:space-between;height:64px}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px;text-decoration:none}
.logo b{display:inline-flex;width:30px;height:30px;border:2px solid var(--ink);border-radius:9px;align-items:center;justify-content:center;background:var(--clay);color:#fff;box-shadow:2px 2px 0 var(--ink);font-size:15px}
.nav a.cta{font-weight:700;font-size:14px;text-decoration:none;background:var(--clay);color:#fff;border-radius:12px;padding:9px 14px;box-shadow:3px 3px 0 var(--ink)}
.nav .links{display:flex;gap:16px;align-items:center;font-size:14px}
.nav .links a{text-decoration:none;color:var(--muted)}
main{padding:36px 0 56px}
.crumbs{font-size:13px;color:var(--faint);margin-bottom:14px}.crumbs a{text-decoration:none}
h1{font-size:clamp(26px,4.5vw,38px);line-height:1.12;letter-spacing:-.02em;font-weight:800;margin:0 0 10px}
.meta{color:var(--muted);font-size:14px;margin-bottom:22px}
.meta .pill{display:inline-block;background:#fff;border:2px solid var(--ink);border-radius:999px;padding:2px 10px;font-weight:700;font-size:12px;margin-right:8px}
.card{background:#fff;border:2px solid var(--ink);border-radius:18px;padding:22px 24px;margin-bottom:18px}
.card h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--clay);margin:0 0 12px;font-weight:800}
.card p{margin:0 0 12px;color:#333}.card p:last-child{margin-bottom:0}
ul.takeaways{list-style:none;padding:0;margin:0}ul.takeaways li{display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;color:#333}
ul.takeaways li::before{content:"";flex:0 0 22px;height:22px;border-radius:7px;background:var(--clay-soft);margin-top:3px;background-image:linear-gradient(var(--clay),var(--clay));background-size:10px 2.5px;background-repeat:no-repeat;background-position:center}
.moments a{display:flex;gap:12px;align-items:flex-start;padding:8px 10px;margin:0 -10px;border-radius:12px;text-decoration:none;color:#333}
.moments a:hover{background:var(--cream)}
.moments .t{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;font-weight:700;color:var(--clay);background:var(--clay-soft);padding:3px 8px;border-radius:7px;white-space:nowrap}
.video{position:relative;border:2px solid var(--ink);border-radius:18px;overflow:hidden;background:#000;aspect-ratio:16/9;margin-bottom:18px;box-shadow:6px 6px 0 var(--clay)}
.video img{width:100%;height:100%;object-fit:cover;display:block;opacity:.92}
.video button{position:absolute;inset:0;width:100%;height:100%;background:transparent;border:0;cursor:pointer}
.video button span{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:72px;height:52px;border-radius:14px;background:var(--clay);display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 #fff}
.video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.cta{background:var(--ink);color:#fff;border-radius:20px;padding:28px;text-align:center;margin-top:30px}
.cta h3{margin:0 0 6px;font-size:24px;letter-spacing:-.01em}.cta p{margin:0 0 18px;color:#bbb}
.cta form{display:flex;gap:10px;max-width:520px;margin:0 auto}
.cta input{flex:1;min-width:0;border:2px solid #fff;border-radius:14px;padding:14px 16px;font:inherit;font-weight:600;background:#fff;color:var(--ink)}
.cta button{border:0;border-radius:14px;padding:14px 20px;font:inherit;font-weight:800;background:var(--clay);color:#fff;cursor:pointer;box-shadow:3px 3px 0 #fff}
.cta small{display:block;margin-top:12px;color:#888}
.share{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:4px 0 24px}
.share button,.share a{font:inherit;font-weight:700;font-size:14px;background:#fff;border:2px solid var(--ink);border-radius:12px;padding:8px 14px;cursor:pointer;text-decoration:none;color:var(--ink)}
.share .ok{color:#00A843;font-size:13px;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.item{background:#fff;border:2px solid var(--ink);border-radius:16px;padding:16px;text-decoration:none;display:flex;flex-direction:column;gap:8px}
.item:hover{box-shadow:4px 4px 0 var(--clay);transform:translate(-1px,-1px)}
.item img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;border:1.5px solid var(--cream3)}
.item h3{margin:0;font-size:16px;line-height:1.3}.item p{margin:0;color:var(--muted);font-size:13px}
.item small{color:var(--faint);font-size:12px}
.pager{display:flex;gap:12px;justify-content:center;margin-top:28px;font-weight:700}.pager a{text-decoration:none;background:#fff;border:2px solid var(--ink);border-radius:12px;padding:8px 14px}
footer{border-top:2px solid var(--cream3);padding:22px 0;text-align:center;color:var(--faint);font-size:13px}footer a{color:var(--faint);text-decoration:none;margin:0 8px}
@media(max-width:560px){.cta form{flex-direction:column}.nav .links{display:none}}
`;

function layout({ title, description, canonical, og = {}, jsonLd = [], body, noindex = false }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="${esc(og.type || 'article')}">
<meta property="og:site_name" content="YepIts.ai">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:title" content="${esc(og.title || title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(og.image || `${SITE}/og-image.png`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(og.title || title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(og.image || `${SITE}/og-image.png`)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>${CSS}</style>
${jsonLd.map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
<header><div class="wrap nav">
  <a class="logo" href="/"><b>Y</b> YepIts.ai</a>
  <div class="links"><a href="/summaries">Summaries</a><a href="/blog">Blog</a><a class="cta" href="/?utm_source=summary_page&utm_medium=nav">Try free</a></div>
</div></header>
<main><div class="wrap">${body}</div></main>
<footer><div class="wrap">© ${new Date().getFullYear()} YepIts.ai · Made by a human. Powered by AI.<div><a href="/summaries">Summaries</a><a href="/blog">Blog</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a></div></div></footer>
</body></html>`;
}

function ctaBlock(source) {
  return `<section class="cta">
  <h3>Summarize your own video</h3>
  <p>Paste any YouTube link. Key points, takeaways, and timestamps in seconds.</p>
  <form action="/" method="get">
    <input type="url" name="url" placeholder="https://www.youtube.com/watch?v=..." required>
    <input type="hidden" name="utm_source" value="${esc(source)}"><input type="hidden" name="utm_medium" value="cta">
    <button type="submit">Summarize</button>
  </form>
  <small>Free. 3 summaries a day. No account needed.</small>
</section>`;
}

export function renderSummaryPage(s, { canonical }) {
  const watch = `https://www.youtube.com/watch?v=${s.video_id}`;
  const thumb = `https://i.ytimg.com/vi/${s.video_id}/hqdefault.jpg`;
  const desc = String(s.summary).replace(/\s+/g, ' ').slice(0, 155).replace(/\s\S*$/, '') + '…';
  const title = `${s.title} — Summary & Key Takeaways`;
  const paragraphs = String(s.summary).split(/\n{2,}|\n/).map(p => p.trim()).filter(Boolean);
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'Article',
      headline: `${s.title} — Summary`, description: desc, url: canonical,
      datePublished: new Date(s.created_at).toISOString(), dateModified: new Date(s.updated_at).toISOString(),
      author: { '@type': 'Organization', name: 'YepIts.ai', url: SITE },
      publisher: { '@type': 'Organization', name: 'YepIts.ai', url: SITE },
      image: thumb,
      about: { '@type': 'VideoObject', name: s.title, url: watch, thumbnailUrl: thumb, ...(s.channel ? { author: { '@type': 'Person', name: s.channel } } : {}) },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Summaries', item: `${SITE}/summaries` },
        { '@type': 'ListItem', position: 3, name: s.title, item: canonical },
      ],
    },
  ];
  const body = `
<div class="crumbs"><a href="/">Home</a> › <a href="/summaries">Summaries</a></div>
<h1>${esc(s.title)}</h1>
<div class="meta">
  ${s.duration ? `<span class="pill">${esc(fmtDuration(s.duration))} → ${readTime(s.summary)} min read</span>` : ''}
  ${s.channel ? `${esc(s.channel)} · ` : ''}<a href="${watch}" rel="noopener nofollow" target="_blank">Watch on YouTube</a>
</div>
<div class="video" id="video">
  <img src="${thumb}" alt="${esc(s.title)}" loading="lazy" width="480" height="360">
  <button type="button" aria-label="Play video" onclick="var v=document.getElementById('video');v.innerHTML='<iframe src=&quot;https://www.youtube-nocookie.com/embed/${s.video_id}?autoplay=1&quot; allow=&quot;autoplay; encrypted-media; picture-in-picture&quot; allowfullscreen title=&quot;${esc(s.title).replace(/"/g, '')}&quot;></iframe>'"><span><svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></span></button>
</div>
<div class="share">
  <button type="button" onclick="(async()=>{var u=location.origin+location.pathname;try{if(navigator.share){await navigator.share({title:document.title,url:u})}else{await navigator.clipboard.writeText(u);document.getElementById('copied').textContent='Link copied'}}catch(e){}})()">Share this summary</button>
  <a href="${watch}" rel="noopener nofollow" target="_blank">Open video</a>
  <span class="ok" id="copied"></span>
</div>
<section class="card"><h2>Summary</h2>${paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</section>
${s.takeaways?.length ? `<section class="card"><h2>Key takeaways</h2><ul class="takeaways">${s.takeaways.map(t => `<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}
${s.timestamps?.length ? `<section class="card moments"><h2>Key moments</h2>${s.timestamps.map(m => `<a href="${watch}&t=${parseInt(m.seconds, 10) || 0}s" rel="noopener nofollow" target="_blank"><span class="t">${esc(m.time)}</span><span>${esc(m.label)}</span></a>`).join('')}</section>` : ''}
${ctaBlock('summary_page')}
<p style="text-align:center;color:var(--faint);font-size:12px;margin-top:22px">Generated by YepIts.ai from the video's captions. Summaries can miss nuance — watch the key moments for anything that matters.</p>`;
  return layout({ title, description: desc, canonical, og: { title, image: thumb }, jsonLd, body });
}

function renderIndexPage(items, page, total) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canonical = page > 1 ? `${SITE}/summaries?page=${page}` : `${SITE}/summaries`;
  const body = `
<h1>Video summaries</h1>
<p class="meta">${total} YouTube videos turned into 2-minute reads. Newest first.</p>
<div class="grid">${items.map(i => `<a class="item" href="/s/${i.video_id}/${esc(i.slug)}">
  <img src="https://i.ytimg.com/vi/${i.video_id}/mqdefault.jpg" alt="" loading="lazy" width="320" height="180">
  <h3>${esc(i.title)}</h3>
  <p>${esc(String(i.excerpt).replace(/\s+/g, ' ').slice(0, 120))}…</p>
  <small>${esc(i.channel || '')}${i.duration ? ` · ${esc(fmtDuration(i.duration))}` : ''}</small>
</a>`).join('')}</div>
${pages > 1 ? `<div class="pager">${page > 1 ? `<a href="/summaries?page=${page - 1}">← Newer</a>` : ''}<span style="padding:8px 0;color:var(--faint)">${page} / ${pages}</span>${page < pages ? `<a href="/summaries?page=${page + 1}">Older →</a>` : ''}</div>` : ''}
${ctaBlock('summaries_index')}`;
  return layout({ title: page > 1 ? `Video summaries · page ${page} — YepIts.ai` : 'Video summaries — YepIts.ai', description: 'Browse AI summaries of YouTube videos: key takeaways and timestamps for talks, podcasts, lectures, and tutorials.', canonical, og: { type: 'website' }, body, noindex: items.length === 0 });
}

function renderNotFound() {
  const body = `<h1>No summary here yet</h1><p class="meta">This video hasn't been summarized, or the link is wrong. Paste the YouTube link below and we'll make one.</p>${ctaBlock('summary_404')}`;
  return layout({ title: 'Summary not found — YepIts.ai', description: 'This video has not been summarized yet.', canonical: `${SITE}/summaries`, body, noindex: true });
}

let staticSitemapUrls = null;
function getStaticSitemapUrls() {
  if (staticSitemapUrls) return staticSitemapUrls;
  try {
    const xml = fs.readFileSync(path.join(__dirname, '../public/sitemap.xml'), 'utf8');
    staticSitemapUrls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => m[1].trim());
  } catch { staticSitemapUrls = [`<loc>${SITE}/</loc>`]; }
  return staticSitemapUrls;
}

export function mountPublicPages(app) {
  const summaryHandler = (req, res) => {
    const id = String(req.params.videoId || '');
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return res.status(404).type('html').send(renderNotFound());
    const s = getPublicSummary(id);
    if (!s) return res.status(404).type('html').send(renderNotFound());
    const canonical = `${SITE}/s/${s.video_id}/${s.slug}`;
    if (req.params.slug !== s.slug) return res.redirect(301, `/s/${s.video_id}/${s.slug}`);
    trackPage(req, res);
    if (!req.isBot) incrementSummaryViews(id);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.type('html').send(renderSummaryPage(s, { canonical }));
  };
  app.get('/s/:videoId', summaryHandler);
  app.get('/s/:videoId/:slug', summaryHandler);

  app.get('/summaries', (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const total = countPublicSummaries();
    const items = listPublicSummaries({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
    trackPage(req, res);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.type('html').send(renderIndexPage(items, page, total));
  });

  app.get('/sitemap.xml', (req, res) => {
    const dynamic = allPublicSummaryUrls().map(r =>
      `<loc>${SITE}/s/${r.video_id}/${esc(r.slug)}</loc>\n    <lastmod>${fmtDate(r.updated_at)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>`);
    const index = `<loc>${SITE}/summaries</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>`;
    const all = [...getStaticSitemapUrls(), index, ...dynamic];
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${all.map(u => `  <url>\n    ${u}\n  </url>`).join('\n')}\n</urlset>\n`);
  });
}
