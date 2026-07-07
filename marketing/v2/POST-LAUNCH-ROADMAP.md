# YepIts.ai — Post-Launch Roadmap (Day 8 onward)

**Status:** Locked and parked. Anything here is **explicitly not promised** in launch copy.

The roadmap is split into two buckets:
- 🟢 **Ship in week 2** — small, unlocks monetization, addresses real user friction
- 🔵 **Ship in month 1** — bigger builds, reasonable to defer until you have signal

---

## 🟢 Week 2 — "Make Pro worth paying for"

### 1. Chrome Extension (Manifest V3) — `extension/`
**Why first:** the most-asked missing feature on similar tools, and "extension is coming" is the cheapest possible crowd-pleaser. Pure dev work — no infra needed.

Scope:
- `extension/manifest.json` — Manifest V3, `host_permissions: youtube.com`, no `tabs` permission
- `extension/content.js` — detect video page, inject "Summarize" button next to Subscribe
- `extension/background.js` — POST `/api/summarize` with current `window.location.href`, get summary back
- Open in a side panel reusing the existing summary UI (`/summary` route on web, opened in iframe or popout)
- No API key in the extension — call the existing public API

Files actually shipped: `extension/manifest.json`, `extension/content.js`, `extension/background.js`, `extension/icon-{16,48,128}.png` (use the existing `marketing/ph-logo.png` as base)

**Web Store submission:** After the code is polished. Expect 1–3 day Google review.

Once it ships, re-add the "Chrome extension" line to the JSON-LD featureList and update llms.txt to drop the roadmap line.

### 2. Markdown export (Pro-tier only) — `server/index.js`
The site already advertises this in `featureList`. Doesn't exist yet in code path. ~50 lines:
- Add an `Accept` header branch or `?format=md` query param on the same `/api/summarize`
- Return markdown text body if Pro user + asked for md
- Wire `Export to .md` button on frontend `Summary` component

### 3. Shareable summary pages — `/s/<hash>`
A growth loop. When someone clicks "Share" on a summary, generate `https://yepits.ai/s/<hash>` and store `{summary, video meta}` keyed by hash in SQLite. Free or Pro — doesn't matter, the point is SEO juice from social shares.

---

## 🔵 Month 1 — "Make the product stickier"

### 4. Video history (Pro)
Optional account login → shows last 20 summaries for that account. Requires opt-in only.

### 5. Multi-language summary output
Currently hardcoded English summary. Anthropic supports ~30 output languages. Add a `language` query param. Marketing angle: "summarize in your native language."

### 6. Share-to-Twitter-X button
Auto-formatted: "I just summarized '[video title]' in 30 seconds with yepits.ai — [summary preview]". One-click share with `?utm_source=twitter&utm_campaign=...`.

### 7. Email digest for popular channels
Hook the RSS feed from a YouTube channel → auto-summarize new uploads → weekly email summary. Beta this for ~10 power users before publicizing.

---

## Decision log

- 2026-07-07: Decided to ship WITHOUT Chrome extension on Day 0, build it on Day 8+ instead. Rationale: launches succeed when shipped, not when perfect.
