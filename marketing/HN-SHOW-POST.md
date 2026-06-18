# Hacker News — Show HN Post

**Title:** Show HN: I built a YouTube video summarizer that costs $0.003 per summary

**Body:**

Hi HN,

I built https://yepits.ai — paste any YouTube URL, get an instant AI summary with key takeaways and clickable timestamps.

**Why I built it:** My "Watch Later" playlist was 200+ videos deep. Most were 30-60 minute conference talks, lectures, and tutorials where I needed maybe 5 minutes of actual content. I kept skipping around trying to find the relevant parts.

**How it works:**
1. Fetch the video transcript via YouTube's InnerTube API (the internal API the Android app uses — not the public Data API which has quotas, and not scraping which gets rate-limited)
2. Feed the transcript to Claude Haiku with a structured prompt
3. Return: summary, 5-8 key takeaways, and timestamps for the important moments

**Cost economics:**
- Each summary costs ~$0.003 in Claude API calls
- Free tier: 3 summaries/day, videos up to 10 minutes
- Pro tier: $7/month for unlimited summaries on any video length
- Break-even at ~2.3 Pro subscribers per day of free-tier usage

**Tech stack:** React + Vite + Tailwind, Node.js + Express, SQLite, Stripe, deployed on Railway via Dockerfile.

**What I learned about YouTube transcripts:** The web client gets captcha-walled after a few requests from a cloud IP. The InnerTube API with an ANDROID client context bypasses this completely — no API key, no rate limits. YouTube serves different responses to different clients.

**Chrome extension:** Also built a Manifest V3 extension that adds a "⚡ Summarize" button directly on YouTube watch pages.

Would love feedback on the summary quality, the pricing model, or the technical approach. Happy to share more details on the InnerTube integration if anyone's interested.

Try it: https://yepits.ai
