# YepIts.ai — Forum Reply (v2)

**Target thread (re-verify exists before posting):**
`https://www.aitalkboard.com/other-llms-forum/best-ai-tool-for-summarizing-long-youtube-videos-60854/`

If the URL is dead or the thread has been closed, **do not post**. Find an active similar thread on the same site or another AI-tools forum. Better to skip a forum post than to spam a closed one.

---

## Reply (paste as-is, do not edit on the fly)

Hey, I was in the same boat a few months back. Tried Eightify (paywall after 3), NoteGPT (10/month cap), Glasp (great but more for read-later), and the manual transcript + ChatGPT route (works but tedious once you stack 5+ videos).

Ended up building something for it: https://yepits.ai — paste a YouTube URL, get a 2-paragraph summary + key takeaways + clickable timestamps.

What I'd flag for anyone testing it:
- It uses Claude under the hood for the summary, which in my testing handles jargon better than the GPT-3.5-tier tools. If you've been frustrated with summaries that "hallucinate structure" — i.e. make the video sound more organized than it was — this seems to do less of that.
- The timestamps are the underrated part. They map directly to the transcript, so "jump to 12:34" actually lands at 12:34 in the original video. Useful if you want the highlights + the option to deep-dive.
- Free tier is 3/day, capped at 15-min videos. Pro is $7/mo for longer videos and unlimited runs.
- No browser extension. The whole thing is a web app — paste a URL, get a summary, done. So no extension permissions concerns.

Not a magic bullet for everything (it needs captions, can't do pure video/audio content), but for the use case in this thread it's been working for me and a few people I've pointed at it.

Happy to summarize a video from the thread if anyone wants to spot-check the output quality.

---

## Posting rules for this thread specifically

- Do not mention "Hey I'm the maker" outright. Soft-position it as "I built something for my own use".
- Do NOT link to a Chrome extension — none is shipped.
- If someone calls you out for self-promo, acknowledge it, link to the tool once, and move on. Don't argue.
- Do not mass-reply across the forum. One thread, one post.

---

## Track

Log to `marketing/v2/launch-log.csv` (or notes app): `forum_reply <subreddit> yes/no posted, URL, date`.
