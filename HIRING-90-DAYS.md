# YepIts.ai — Developer First 90 Days

> **Read this before you write a single line of code.**
>
> This is the plan for the next developer joining YepIts.ai. It assumes you've already shipped a SaaS before, you know React + Node, and you don't need hand-holding on the basics. The goal of these 90 days is **stability + first measurable growth feature**, not "rewrite everything."

---

## 0. Before day 1 — read these (1 hour)

| File | Why |
|---|---|
| `CLAUDE.md` (root) | Original brief — context for what YepIts.ai IS. NOTE: it's stale in places (mentions "TL;DR Video", Inter font, forest green). The actual deployed product is "YepIts.ai", Bricolage Grotesque font, cream/clay neo-brutalist. Trust the live site + this plan, not the colors in CLAUDE.md. |
| `README.md` | Local dev setup. |
| `Dockerfile` + `railway.toml` | How it actually deploys. The Dockerfile builds `frontend/` and runs `server/index.js`. **The root `src/`, `index.html`, `vite.config.js`, etc. are STALE DUPLICATES** from an old layout. The deployed build is from `frontend/`. Don't edit the root copies — they're ghosts. |
| `frontend/src/App.jsx` (603 lines) | The whole SPA in one file. Read top-to-bottom. Notice the `view` state machine (`landing` / `result` / `tooLong` / `auth` / `blog`). |
| `server/index.js` (809 lines) | Express app. Routes (use grep to find `app.(get\|post)`): summarize, auth, stripe, compare, leads, health, debug. |

**Repo layout (current truth):**
```
tldr-video/
├── frontend/          ← source of truth for React app
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── Blog.jsx
│   │   ├── index.css
│   │   └── components/
│   │       ├── Landing.jsx
│   │       ├── Summary.jsx
│   │       ├── Compare.jsx
│   │       ├── Loading.jsx
│   │       ├── Auth.jsx
│   │       └── CookieBanner.jsx
│   └── dist/          ← gitignored, built artifact
├── server/            ← source of truth for Express backend
│   ├── index.js       ← all routes
│   ├── db.js          ← better-sqlite3 schema + queries
│   └── package.json
├── blog-posts/        ← real markdown, imported raw by Blog.jsx
├── public/            ← served at site root (favicons, llms.txt)
├── marketing/         ← launch assets (defer to v2)
├── Dockerfile         ← builds frontend/ + runs server/index.js
├── railway.toml       ← dockerfile builder, rootDir="."
└── root src/, index.html, vite.config.js, src/Blog.jsx, etc.
                      ← STALE DUPLICATES. Do NOT edit. May be deleted in a future commit.
```

---

## 1. What "done" looks like at the end of 90 days

- **Stability:** zero unplanned outages. Error rate on `/api/summarize` < 1%. Mean p95 latency < 8s.
- **One growth feature shipped:** chosen from the menu in §4. Each has a clear success metric.
- **CI/CD in place:** every push to `main` builds, tests, and deploys automatically. No more "I forgot to run `railway up`" bugs.
- **You can leave for 2 weeks** and the site keeps running without you touching it.

What "done" does NOT include:
- A full rewrite to TypeScript
- A new backend framework
- A mobile app
- A custom CMS for blog posts

---

## 2. Days 1–14 — Orient, stabilize, ship safety nets

### Goal: zero "blank page" incidents, deploy is no longer manual.

| Day | Task | Done when |
|---|---|---|
| 1 | Read every file in `frontend/src/`, `server/`, and the deploy config. Don't code yet. | You can draw the request/response lifecycle for `/api/summarize` on a whiteboard. |
| 2 | Get the project running locally. Both `cd frontend && npm run dev` and `cd server && npm run dev`. Verify you can hit `http://localhost:5173` and submit a YouTube URL. | Local end-to-end works on a real YouTube video. |
| 3 | **Wire up GitHub auto-deploy on Railway.** Go to Railway dashboard → YepIts AI service → Settings → GitHub Repo → connect `github.com/AntoskaJede/yepitsai`, branch `main`. | Every push to `main` triggers a Railway rebuild. Verify by pushing an empty commit and watching the deploy fire. |
| 4 | **Add an `ErrorBoundary` component to `App.jsx`.** Without one, ANY JSX reference bug blanks the entire site (this literally happened — a missing prop crashed the whole page for ~2 weeks because deploys were manual). Wrap `<App />` in `main.jsx`. | Try injecting `throw new Error('test')` into a render — confirm the user sees a fallback banner with the error, not a blank page. Revert the test. |
| 5–7 | **Write a post-deploy smoke test.** Use Playwright (already proven to work — see `/tmp/yepits-verify/test.mjs` for the pattern). The test: load `https://yepits.ai/`, wait 5s, assert `document.querySelector('#root').innerHTML.length > 1000`, assert zero `pageerror` events, assert no 4xx/5xx network responses. Save it as `.github/workflows/smoke.yml` so it runs after each Railway deploy (use Railway's deploy webhook → GitHub Action trigger). | Push a small change → it deploys → smoke test runs → green check on the PR. |
| 8–10 | **Add structured logging.** Right now the server logs to stdout. Add a request logger middleware (`morgan` or hand-rolled) that logs: timestamp, route, status, duration, userId-or-anon, videoId (for `/summarize`). Pipe to Railway's log drain so we can grep. | You can answer "how many summaries in the last 24h?" by `grep`ing logs. |
| 11–14 | **Audit `server/index.js` for the secret-leak bugs that almost shipped in earlier commits.** Check for: hardcoded `sk_*`, `whsec_*`, `re_*`, fallback JWT secrets, fallback Stripe keys. Add a CI lint rule (e.g. `gitleaks`) that fails the build if a secret is committed. | `gitleaks detect` returns 0 findings on the current `main`. |

**Why these first?** Because every minute spent firefighting "is the site down?" is a minute NOT spent on the feature in §4. Pava is solo + hands-off — stability IS the product.

---

## 3. Days 15–30 — Observability + cost control

### Goal: know what's happening, stop the bleeding on Anthropic costs.

| Day | Task | Done when |
|---|---|---|
| 15–17 | **Add `/api/health` to actually report health, not just stats.** Have it check: DB connection (`SELECT 1`), Anthropic API key validity (`messages.create` with 1 token), Stripe API key validity, YouTube transcript fetch on a known video. Return JSON with per-check pass/fail. | You can curl `/api/health` and immediately tell which dependency is down. |
| 18–21 | **Add cost tracking to `/api/summarize`.** The route already calls Anthropic. Track: input tokens, output tokens, model, cost (USD), videoId, duration. Store in a new `summary_costs` table. Surface a `/api/admin/costs?since=YYYY-MM-DD` route (basic auth or a shared secret env var). | You can answer "what did Claude cost us last week?" with a number. |
| 22–25 | **The 7-day in-memory summary cache is a footgun.** Find it in `server/index.js` (search for `cache`). Make sure: cache key includes model name, max size is bounded (LRU not unbounded Map), cache hit logs include videoId. If it's an unbounded Map, replace with `lru-cache` package. | No more "memory grows forever" if traffic spikes. |
| 26–30 | **Rate limiting audit.** `express-rate-limit` is configured. Verify: anon limit is 3/day (not /hour as CLAUDE.md says — that was changed), per-IP not per-user, returns 429 with a clear message, doesn't block the Stripe webhook route. Add a `Retry-After` header. | Stress test (50 requests/min from one IP) → first 3 succeed, then 429s with proper headers. |

---

## 4. Days 31–60 — Ship ONE growth feature

**Pick ONE of these** in consultation with Pava. Each has a clear success metric.

### Option A: Public shareable summary links (most aligned with "viral loop")
- **What:** When a user summarizes a video, generate a unique short URL (`/s/abc123`). Anyone with the link sees the summary, no auth required. Optionally show "summarized 47 times" social proof.
- **Why:** Free users have a reason to come back (their link keeps working) and a reason to upgrade (Pro summaries have nicer share cards + no "summarized with YepIts.ai" footer).
- **Files:** new `summaries` table in `db.js`, new route `GET /s/:slug`, new React route for shared view, new share button in `Summary.jsx`.
- **Success metric:** >20% of summaries get shared (track via `summary_shares` table), >5% of shared-link visitors return and sign up.

### Option B: Chrome extension v2 (already exists at `yepitsai-extension` per memory)
- **What:** Audit the existing extension. Likely gaps: Pro upgrade flow, error handling, summary cache, side-panel UX on long videos.
- **Why:** Every Chrome extension user is a daily-active user. High LTV.
- **Files:** `yepitsai-extension/` (separate repo per memory), but needs CORS work in `server/index.js` (recent commit `0cfb3c3 fix(cors)` already started this).
- **Success metric:** Extension MAU > 200 within 60 days of v2 launch, MAU→Pro conversion > 2%.

### Option C: Multi-language summaries
- **What:** Use Claude to translate the summary/takeaways/timestamps into ES, DE, FR, PT, JA based on the video's auto-detected language.
- **Why:** Unlocks non-English YouTube (which is the majority of long-form content). SEO wins in 5 markets overnight.
- **Files:** add `language` param to `/api/summarize`, add language picker to `Landing.jsx`, store preference in localStorage.
- **Success metric:** >10% of new sessions use a non-English summary.

### Option D: Audio summary (TTS)
- **What:** After generating the text summary, send it to ElevenLabs / OpenAI TTS and play it back. Pro feature.
- **Why:** Podcast listeners are a named use case in the landing page ("Catch up on 3-hour episodes during your coffee break") but currently they have to READ the summary.
- **Files:** new `/api/tts` route, audio player in `Summary.jsx`, Stripe meter for TTS usage.
- **Success metric:** >5% of Pro users use TTS weekly, justifies $2-3 price increase.

**Pick the one that aligns with where the next 100 paying users will come from.** My recommendation is A if you don't have a clear sense, B if you do, D if you want a quick Pro upgrade hook.

---

## 5. Days 61–90 — Polish + handoff

| Day | Task | Done when |
|---|---|---|
| 61–70 | **Whatever the chosen feature needs to be considered "done"** — bug fixes, edge cases, the "is this actually helping?" look at metrics. | The success metric from §4 is trending up after 14 days post-launch. |
| 71–77 | **Write the SOPs that Pava and I have in our heads.** Things like: "how to roll back a bad deploy", "how to add a new env var", "how to respond to a Stripe webhook failure", "how to test a new prompt change in production". Save them as `/docs/runbook/*.md` and link from this file. | A new dev (or me, after a long break) can find the answer to any operational question in <5 min. |
| 78–84 | **Refactor pass: split `App.jsx` into modules.** The 603-line monolith is fine, but every additional view makes it harder. Split out: `views/` directory with `LandingView.jsx`, `ResultView.jsx`, `TooLongView.jsx`, `AuthView.jsx`, `BlogListView.jsx`, `BlogPostView.jsx`. Keep `App.jsx` as just the router + Header. | Each view file is <200 lines, `App.jsx` is <100 lines. |
| 85–90 | **End-of-90-days retro + handoff doc.** What worked, what didn't, what's still broken, what should the next 90 days look like. Post it as a GitHub Discussion. | Pava has a clear answer to "what does this person do next?" |

---

## 6. Things you will probably NOT need to do (good news)

- ❌ Set up auth from scratch (already there — signup/login/verify/reset/delete)
- ❌ Integrate Stripe from scratch (already there — checkout, webhook, customer portal)
- ❌ Build the YouTube transcript pipeline (already there — InnerTube with 4 client fallbacks + youtube-transcript + Supadata fallback)
- ❌ Set up email sending (Resend is wired)
- ❌ Build the blog (already there with 2 real markdown articles)
- ❌ Build the Chrome extension from scratch (v2.0.0 exists at `yepitsai-extension` per memory)

## 7. Things you WILL probably want to refactor (warning)

- 🟡 `App.jsx` is 603 lines — fine for now, but add new views as separate files from day 1
- 🟡 No tests. Zero. Add Playwright smoke tests as you go, don't try to backfill unit tests
- � The root `src/`, `index.html`, `vite.config.js`, `src/Blog.jsx`, `src/main.jsx`, `src/index.css`, `src/blog-data.js`, `src/App.jsx` are STALE DUPLICATES. **Never edit them.** A future commit will delete them; your job is to make sure the deploy works without them (it does — Dockerfile only touches `frontend/` and `server/`)
- 🟡 `server.js` at the root is also stale. Don't run it (it has a hardcoded `SUPADATA_KEY` and `sk_test_*` Stripe key in plain text — this is the leak risk that gitleaks needs to catch)
- 🟡 Cloudflare is in front of the site with `cache-control: max-age=14400` on the JS bundle. **After a deploy, Cloudflare may serve stale JS for up to 4 hours.** Use `Cache-Control: no-cache` on the HTML (which it already does — good) but be aware the JS cache is sticky. When debugging "is the live site still broken?", curl the bundle URL with a cache-bust query string.

## 8. The dev workflow

```bash
# Day-to-day
cd /Users/anton/.openclaw/workspace/projects/tldr-video
git checkout -b feature/<short-name>
# edit code
cd frontend && npm run build       # catch JSX/reference errors locally
cd ../server && node --check index.js   # catch syntax errors locally
git add -p && git commit -m "..."
git push origin feature/<short-name>
# open PR → review → merge → Railway auto-deploys (after Day 3 task)

# Hot fix (skip the PR)
cd /Users/anton/.openclaw/workspace/projects/tldr-video
git checkout main && git pull
# edit, commit, push
# Railway auto-deploys
```

## 9. Who to ping for what

| Topic | Ping |
|---|---|
| Stripe / billing / pricing changes | Pava (approves), you (implements) |
| Env var changes | Pava (approves), you (implements) |
| Deploy failures | Check Railway logs first; ping me (Hermes) if stuck |
| Feature priority / roadmap | Pava decides |
| Bug reports from users | Discord `#yepits-support` (Pava monitors via bot) |
| Anything you don't know | me (Hermes) — I have full context on this codebase |

## 10. The "I'm stuck" ladder

1. Read the error message. Read it twice.
2. `git log --oneline -20` — has someone fixed this already?
3. `grep -r "the thing" server/ frontend/` — is the thing referenced somewhere I missed?
4. Check Railway logs: `railway logs --lines 100`
5. Reproduce locally: `cd server && npm run dev` + `cd frontend && npm run dev`
6. Ping me with: what you tried, the exact error, the file + line. I'll have context in <30 sec.

---

*This document was generated on 2026-08-19 as part of Pava's team-build planning. Edit it as the plan evolves; commit changes so the next person has the latest version.*
