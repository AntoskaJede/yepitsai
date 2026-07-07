# YepIts.ai — Measurement Plan (v2)

**Goal:** know which channel brought which signup so we can double down on what works.

I'm proposing a 2-layer stack. Both are zero-cost and you don't need a credit card. You can run with one or both — I'd recommend both because they cover different signals.

## Layer 1 — Cloudflare Web Analytics (free, no script, GDPR-friendly)

Your site is behind Cloudflare (CF-cache-status header confirmed earlier), so this is the easiest win in the world:

1. Go to https://www.cloudflare.com/
2. Log in as the account that owns the `yepits.ai` DNS zone
3. Navigate to **Analytics → Web Analytics**
4. Click **Add a site**, enter `yepits.ai`
5. CF injects a beacon via the CF worker — no JS change on your side
6. It tracks page views, country, referrer, browser — *no* cookies, *no* script tag

**What you get:** per-day page view counts, country breakdown, referrer URLs (so you can see "5 visits came from Reddit today").

**What you DON'T get:** per-UTM attribution, per-click conversion funnel, anything user-specific.

## Layer 2 — UTM-tagged URLs (free, attribution layer)

Every channel's posts in `marketing/v2/*.md` already use distinct UTMs. Two pieces of plumbing to make them useful:

### 2a. Capture UTMs on first visit

This needs a tiny server-side hook. Two options:

**Option A (cleanest):** cookie the UTM params for 30 days, attach them to the *Pro sign-up* event (or the *first successful summary* event). If you don't have a back-end user table yet, a `data/sessions.csv` log of `{ts, ip, utm_source, utm_campaign, utm_content, referrer}` is enough for week one.

**Option B (zero code):** add the UTMs to every link in `blog-posts/*.md` so SEO traffic is also attributed.

Either way, the rule is: **never post a `yepits.ai` link without a `?utm_*` suffix outside of organic contexts.** Organic = email signatures, internal docs, banners-with-no-attribution-needed.

### 2b. Capture UTM-to-Pro conversion

When someone hits `/upgrade` (or clicks your "Get Pro" button), log the UTM params that brought them here. A simple SQL `INSERT INTO attribution(utm_source, created_at) VALUES (...)` on a server-side `/api/track` call is enough.

If you're not ready to add a DB, drop a CSV row from the `/api/summarize` handler on a successful summary: `{timestamp, ip, utm_source, video_url}`. The first "summary succeed" per IP-per-day is your daily signup proxy.

## Layer 3 — A tiny ops log

`/marketing/v2/launch-log.csv` with columns:

```
date,channel,sub,url,posted_at,first_24h_views,first_24h_comments,first_24h_signups,notes
```

This isn't analytics — it's a manual log you fill in once a day. Faster than setting up dashboards, more honest than relying on Plausible for week-one data. Total time per day: <5 min.

## Minimum-viable measurement setup (do this once before Day 0)

```bash
# 1. Enable CF Web Analytics on the yepits.ai zone (manual, in the dashboard).
# 2. Verify the live site still works:
curl -sS -o /dev/null -w "site: HTTP %{http_code}\n" https://yepits.ai

# 3. Drop a 1-line log file:
mkdir -p data && touch data/sessions.csv && head -1 data/sessions.csv > "ts,ip,utm_source,video_id,duration_s"
```

That's it. You can layer in Plausible (self-host on Railway, ~$5/mo) or PostHog if you outgrow this — but start here.

## What I'll do for you (Toto)

- Day 0 +1: read the launch-log, summarize what each channel did in 24h
- Daily for the launch week: pull the CSV, write a 5-line status to your WhatsApp
- Day 7: a short retro doc — which channels to keep investing in, which to cut

---

**Quick reality check on attribution.** You can't perfectly attribute a paying user who saw your HN post on Monday, your Reddit post on Tuesday, and your TikTok on Wednesday. That's fine. The goal isn't per-user attribution — it's per-channel attribution: "Did HN send 100 signups last week? Did Reddit send 200? Did TikTok send 0?" *That* answer is enough to make marketing decisions in week 1.
