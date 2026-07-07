# YepIts.ai — Locked Pricing Spec
# SINGLE SOURCE OF TRUTH. Every draft in /marketing/v2/ references these numbers.
# Last updated: 2026-07-07 (post-launch, locked before outbound posts).

## Free tier
- **3 summaries per day** (per IP, no account required)
- **Video length cap: 15 minutes**
- Watermark: none (yet — add if needed for free-tier conversions later)
- No credit card

## Pro tier
- **$7/month** (or $70/year if you want to add annual — recommend doing that)
- Unlimited summaries, no video-length cap
- Coming-soon features that are listed on the site (keep these only if they actually exist):
  - Markdown export
  - Shareable summary pages (growth loop)

## Things we EXPLICITLY do not promise yet
- ❌ Chrome extension (built, not published — pull from all public copy)
- ❌ Account history / video history (Reddit Post 3 mentions it but it's roadmap-only)
- ❌ Stripe-backed Pro (only mention payments if Stripe is wired up)

## Cross-reference checker
When you change copy anywhere, run: `rg -n "3 per|3/day|3/hour|10 min|15 min|Chrome extension|Manifest V3" marketing/v2/ src/`
If the Free tier line says anything other than `3 summaries per day` and `15 minutes`, fix it.
