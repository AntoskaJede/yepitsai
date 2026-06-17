# YepIts.ai — Reddit Posts

Post these in different subreddits. Don't post all at once — space them out over a few days.

---

## POST 1 — r/productivity (Best bet for engagement)

**Title:** I built a tool that summarizes any YouTube video in 2 seconds. Changed how I consume content.

**Body:**

I was spending way too much time watching 30-40 minute videos for 5 minutes of actual useful information. So I built something to fix it.

**What it does:** You paste a YouTube URL, it reads the transcript and gives you:
- A concise summary (2-3 paragraphs)
- Key takeaways (bullet points)
- Timestamps for the important moments (clickable)

**Use cases I've found:**
- Summarizing 2-hour lecture recordings before exams
- Catching up on podcasts I don't have time to listen to
- Skimming conference talks to see if they're worth watching
- Pulling key points from webinars for notes

It's free to try (3 summaries per day, videos up to 10 minutes). No credit card needed.

Check it out: https://yepits.ai

Happy to answer questions or take feedback.

---

## POST 2 — r/studytips

**Title:** Stop watching 2-hour lectures. Summarize them first.

**Body:**

I waste so much time watching recorded lectures when I usually only need the key concepts. So I built a tool that extracts the important stuff from any YouTube video.

Paste the link → get a summary, key points, and timestamps. Jump straight to the parts that matter.

I've been using it to:
- Pre-screen lectures before committing to watching them
- Review multiple lectures quickly before exams
- Get the gist of supplementary videos professors recommend

It's free: https://yepits.ai

3 summaries per day, works on any video with captions.

---

## POST 3 — r/SaaS

**Title:** Built and launched a YouTube summarizer in a weekend. Here's what I learned.

**Body:**

Just launched https://yepits.ai — a tool that turns any YouTube video into a 2-minute read.

**Tech stack (keep it simple):**
- React + Vite + Tailwind for frontend
- Node.js + Express backend
- Claude Haiku for the summarization (~$0.003 per summary)
- YouTube InnerTube API for transcripts (free)
- SQLite for storage
- Stripe for payments
- Railway for hosting

**What worked:**
- Using YouTube's internal API (InnerTube) instead of scraping — no rate limits, no captchas
- Claude Haiku is fast and cheap. Each summary costs me ~$0.003
- Simple freemium model: 3/day free, $7/mo Pro for unlimited
- SQLite over Postgres for an app this size. Way simpler to deploy.

**Pricing:**
- Free: 3 summaries/day, videos up to 10 min
- Pro: $7/month, unlimited everything

**What I'm working on next:**
- Shareable summary pages (growth loop)
- Video history
- Markdown export

Always appreciate feedback from this community. What would you change?

---

## POST 4 — r/webdev or r/programming

**Title:** How I bypass YouTube's transcript rate-limiting on cloud servers

**Body:**

When I deployed my YouTube summarizer (https://yepits.ai) to Railway, YouTube blocked transcript requests from the server's IP. The youtube-transcript npm package would get captcha errors.

**The fix:** YouTube's InnerTube API — the internal API that the Android app uses. You POST to `https://www.youtube.com/youtubei/v1/player` with an Android client context, and it returns caption track URLs without any rate limiting.

```javascript
// Simplified example
const body = {
  context: {
    client: {
      clientName: 'ANDROID',
      clientVersion: '20.10.38',
      hl: 'en',
      gl: 'US'
    }
  },
  videoId: 'YOUR_VIDEO_ID'
};

const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

const data = await response.json();
const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
// Pick English track, fetch transcript JSON from baseUrl
```

No API key needed. No rate limits. Works from any IP.

The key insight: YouTube serves different responses to different clients. The web client gets rate-limited and captcha-walled. The Android client doesn't.

---

## POST 5 — r/Entrepreneur

**Title:** I stopped overthinking and just shipped something simple. Already getting users.

**Body:**

I've been overthinking product ideas for months. Complex SaaS platforms, marketplaces, AI agents... and never launching anything.

So yesterday I said screw it. Built the simplest thing I could think of that I'd actually use: a YouTube video summarizer.

Paste a link. Get a summary. Done.

No complex onboarding. No "schedule a demo." No 47 features. Just one input box and one button.

**What happened:**
- Built it in a few hours
- Free tier gets people hooked (3 summaries/day)
- Pro tier at $7/mo for power users
- Costs ~$0.003 per summary in AI costs
- Profitable from the first paying user

The lesson I keep relearning: simple ships. Complex stalls.

It's at https://yepits.ai if anyone wants to try it.

---

# Posting Schedule

| Day | Subreddit | Post |
|-----|-----------|------|
| Today (Tue) | r/productivity | Post 1 |
| Tomorrow (Wed) | r/studytips | Post 2 |
| Thursday | r/SaaS | Post 3 |
| Friday | r/webdev | Post 4 |
| Saturday | r/Entrepreneur | Post 5 |

**Tips:**
- Don't post more than 1 per day
- Respond to every comment within the first 2 hours (algorithm boost)
- Be genuine — don't over-sell, let the tool speak for itself
- If a post flops, don't repost the same thing. Move on to the next subreddit.
