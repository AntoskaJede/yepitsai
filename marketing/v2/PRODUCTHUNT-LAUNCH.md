# YepIts.ai — Product Hunt Launch (v2)

**Launch target:** Tuesday or Wednesday, 12:01am Pacific (= 03:01 ET, 09:00 CET). Posting-locked: do NOT submit until the night before with this checklist signed off.

## Tagline (57 chars max)
**Turn any YouTube video into a 2-minute read.**

## Tagline option B (if A is taken / crowded)
**Paste a YouTube URL. Get a summary in 2 seconds.**

---

## Short description (max ~260 chars)
YepIts.ai reads any YouTube video's transcript with Claude and gives you a 2-paragraph summary, key takeaways, and clickable timestamps. Built for the Watch Later playlist you never actually watch.

---

## Long description

YepIts.ai is an AI tool that turns YouTube videos into fast, accurate summaries.

Paste a video link → get a concise summary (2–3 paragraphs), 5–8 key takeaways as bullets, and clickable timestamps for the moments that matter. The summary is built on the video's actual transcript — no hallucinated structure, no buzzword filler.

**Who it's for:**
- Students and researchers working through long lectures
- Anyone whose Watch Later is 200+ videos deep
- Newsletter writers and podcast fans who want the gist in 2 min

**How it works:**
1. Paste a YouTube URL
2. The transcript is fetched and given to Claude (Anthropic) with a structured prompt
3. You get back a summary, takeaways, and timestamps
4. Optionally, copy the whole thing with one click

**Pricing:**
- Free: 3 summaries per day, videos up to 15 minutes. No credit card.
- Pro ($7/mo): unlimited summaries, any video length.

**Why now:** Every day more long-form content (lectures, podcasts, talks) migrates to YouTube and the average video length keeps climbing. Reading speeds beat watching speeds. We're building the tool for the part of the audience that already knows this.

---

## Topics (3 max — pick from PH's list)
- Productivity
- Artificial Intelligence
- Education

---

## First-comment (post IMMEDIATELY after going live, before any upvote requests)

Hey! I built YepIts.ai because my Watch Later list got to 200+ videos and I realized I was never going to watch them.

The interesting thing to me wasn't "make a summary" — it was "make a summary that's actually faithful to what the video said." Most summarizers turn everything into the same bland paraphrase. I wanted one that surfaces the actual key points and lets you jump back to the relevant part of the video when you want more detail.

Two design choices worth flagging:
- No login. The whole thing works without an account, IP-rate-limited on the free tier.
- No DB on day one (except for users who hit "save summary"). Wanted to ship friction-free first.

Happy to answer anything — pricing, the transcript pipeline, why Claude over a cheaper model, or what features people actually want next. I'll summarize a YouTube URL from a comment if you drop one in.

---

## Maker-comment followups (use later if the thread goes quiet)

**If someone asks "why not just use ChatGPT?"**
> Two reasons. First, the timestamps — ChatGPT doesn't have the video's transcript with timing data, so it can't give you "jump to minute 12:34 to hear the actual answer." Second, cost — running this on Claude Haiku is ~$0.003 per summary, which is what makes the free tier sustainable.

**If someone asks "why $7/mo?"**
> It's the price where the math works. Each Pro summary costs me ~$0.005 in API + infra; $7/mo with mostly light users comfortably covers abuse. If I'm underpricing I'll find out from conversion data, not from theory.

**If someone asks "what about [competitor]?"**
> I use them too. Eightify is great as a Chrome extension for surfacing summaries inline; NoteGPT has nice editor features; Glasp is a good read-later tool. YepIts.ai is built for the URL-paste-and-go workflow specifically. If you want a short answer to "should I watch this," it's faster than any of those.

---

## Gallery images (use the 4 prepared in marketing/)

Order matters for thumbnails:

1. **ph-homepage.png** — landing page with URL input focused. Use as the *primary* thumbnail.
2. **ph-url-filled.png** — URL pasted, about-to-click state. Use as second thumbnail.
3. **ph-banner.png** — feature banner. Use as third thumbnail.
4. **ph-pricing.png** — pricing/free vs Pro. Use as fourth thumbnail.

Replace any hero shots that mention the Chrome extension — they exist in `marketing/` but we are NOT shipping that promise in this launch.

---

## Launch-day checklist (T-minus counts)

- **T-48h:** Submit PH listing (set it to "scheduled", not "draft", so you can fine-tune). Verify tagline character count. Confirm gallery image order.
- **T-24h:** Email-list / close-friends pre-notification. Post goes live at 12:01am PT — give people 4h heads-up before that.
- **T-12h:** Verify that the site URL `https://yepits.ai/?utm_source=producthunt&utm_medium=social&utm_campaign=launch_v2` resolves to the same homepage (it should — UTM params don't change routing).
- **T-0:** Submit-for-review (PH has moved to scheduled-submission; double-check the calendar date is set).
- **T+0:** Once live, drop the maker comment immediately (copy-paste from above).
- **T+1h:** First engagement pass — reply to every comment, even if it's just a thumbs-up.
- **T+2h onward:** Stay on the thread. Top-3 voted PH launches of the day tend to lock position by hour 3.

---

## What NOT to do

- ❌ Don't promise features that aren't live yet (Chrome extension, video history, Markdown export unless shipped — keep Markdown export since it's in shipping scope)
- ❌ Don't mass-DM friends for upvotes. PH explicitly penalises coordinated upvoting patterns.
- ❌ Don't post the same launch to multiple channels on launch day — keep Reddit / HN / Twitter deferred by ≥24h.
- ❌ Don't argue with criticism in the comments. Quote them, answer with substance or thanks.
