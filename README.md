# YepIts.ai

Turn any YouTube video into a 2-minute read.

## Quick Start (Local)

### Terminal 1 — Backend
```bash
cd server
npm install
npm run dev
```

### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Deploy to Railway

1. Root directory = `server/`
2. Build command: `npm run build` (builds frontend into frontend/dist)
3. Start command: `npm start`
4. Env vars:
   - `ANTHROPIC_API_KEY`
   - `JWT_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_ID`
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `RESEND_API_KEY`
   - `FROM_EMAIL` (optional; defaults to `YepIts.ai <pava@yepits.ai>`)
   - `APP_URL` (optional; defaults to production URL)
   - `CORS_ORIGINS` (optional; comma-separated, defaults to `https://yepits.ai,http://localhost:5173`)
   - `NODE_ENV=production`
5. Point yepits.ai domain to the Railway service

## Analytics

First-party, no third-party script. `server/analytics.js` + the `events` table in SQLite.

- Frontend fires `pageview` on load and `view` on every screen change (`frontend/src/track.js`).
- Server logs `summary`, `summary_limit`, `summary_too_long`, `summary_no_captions`, `signup`, `login`, `checkout_started`, `pro_upgraded`, `pro_canceled`.
- Attribution is first-touch: UTM params or external referrer on the first visit are stored in a 30-day cookie and copied onto the user row at signup, so Stripe upgrades are attributed to the channel that brought the person in.
- Dashboard: `https://yepits.ai/stats?token=<ADMIN_TOKEN>` (7/30/90 day views). JSON: `GET /api/stats?days=30` with header `x-admin-token`.
- Always post links with UTMs: `?utm_source=reddit_studytips&utm_medium=social&utm_campaign=launch_v2`.

## Public summary pages (SEO + share loop)

Every successful summary is stored permanently in `public_summaries` and served as a static-looking HTML page by `server/pages.js`:

- `/s/<videoId>` → 301 → `/s/<videoId>/<slug>` — per-video landing page with title, description, OG image (YouTube thumbnail), Article + BreadcrumbList JSON-LD, click-to-play embed, takeaways, key moments, and a "summarize your own" form that lands on `/?url=…`.
- `/summaries` — paginated index, newest first.
- `/sitemap.xml` — generated: static URLs from `public/sitemap.xml` plus every public page. Submit this once in Google Search Console.
- The result view in the app shows a "Share this summary" button (Web Share on mobile, clipboard elsewhere) and logs a `share` event.

### Seeding pages

`server/scripts/seed.js` calls `/api/summarize` on the live site with the admin token, which bypasses quota and length limits. Each video becomes a page.

```bash
cd server
node scripts/seed.js --dry --limit 50 --playlist "https://www.youtube.com/playlist?list=<ID>"   # list only
node scripts/seed.js --limit 50 --playlist "https://www.youtube.com/playlist?list=<ID>"         # summarize
node scripts/seed.js --urls my-list.txt      # one YouTube URL per line
node scripts/seed.js "https://youtu.be/abc"  # single videos
```

A channel's uploads playlist is `UU` + the channel ID minus its leading `UC` (for example TED: `UUAuUUnT6oDeKwE6v1NGQxug`). Token comes from `ADMIN_TOKEN` env or `server/.env`; `--base http://localhost:3001` targets a local server. Cost is roughly one Haiku call per video; cached videos are free.
