# Show HN: Bypassing YouTube's transcript captcha-wall via the Android InnerTube client

**Title:**
> Show HN: I bypassed YouTube's transcript captcha-wall using the Android InnerTube client

**Why this title beats the old one:**
The old title (`Show HN: I built a YouTube video summarizer that costs $0.003 per summary`) reads as a startup pitch. HN readers have a sixth sense for that format and bury it. The new one leads with the technical insight — the InnerTube trick is genuinely interesting and HN-original. Product comes after.

**Body:**

Hi HN — sharing two things: (1) a non-obvious way to fetch YouTube transcripts from a cloud server without an API key or captcha, and (2) the small product I built around it. The technical bit is the more interesting part; if you only care about that, skip to the "InnerTube" section.

**The context.** I built https://yepits.ai, a YouTube summarizer. Paste a URL, get a 2-paragraph summary + key takeaways + clickable timestamps. It's been live for a couple of weeks.

Deploying it to Railway broke the obvious approach: `youtube-transcript` (npm) calls YouTube's `/youtubei/v1/player` from a default `WEB` client context, and YouTube's edge returns captcha challenges after ~50 requests from a datacenter IP. I rebuilt the call to use an `ANDROID` client context, and the captcha-wall went away. No proxy rotation, no API key, no scraping.

**InnerTube details:**
- Endpoint: `POST https://www.youtube.com/youtubei/v1/player?prettyPrint=false`
- Body:
  ```json
  {
    "context": {
      "client": {
        "clientName": "ANDROID",
        "clientVersion": "20.10.38",
        "hl": "en",
        "gl": "US",
        "androidSdkVersion": 30
      },
      "requestContext": { "useSsl": "TRUE" }
    },
    "videoId": "VIDEO_ID_HERE"
  }
  ```
- Response: standard player payload. Caption tracks are at `captions.playerCaptionsTracklistRenderer.captionTracks[]`. Each track has a `baseUrl` you can fetch (strip `&fmt=...` or you'll get HTML wrapped in JSON, then `JSON.parse` for the timed events).
- Why it works: YouTube applies different edge policies to different client contexts. Android traffic drives watch-time so it's whitelisted; web traffic from cloud IPs gets captcha-walled. This isn't a documented public contract and YouTube can change it any time.
- Caveats: captions may be auto-generated (quality varies); the response includes a `streamingData` block you should NOT touch or you risk a ToS tripwire.

I've shipped this in ~400 lines of Node and it handles a few hundred requests/hour on a $5/mo Railway container without breaking.

**The product (skippable if you only came for the tech):**
- Stack: React + Vite + Tailwind front end, Express backend, Claude Haiku for the summary pass, Railway for hosting. No DB yet, IP-rate-limited free tier covers abuse.
- Pricing: 3 summaries per day for free, capped at videos ≤15 minutes; Pro is $7/mo for unlimited + any-length videos. Anthropic cost per summary is ~$0.003.
- Why I think this is interesting as a product, not just a weekend hack: there's a recurring workflow here for power users of educational content — students, researchers, podcast fans — who already don't have time to watch the videos. The summary is what they actually need; the video is the fallback.

Happy to talk more about the InnerTube integration if anyone wants to dig in: payload schema, error modes, what I learned about how YouTube decides which requests get captcha-walled. Also open to feedback on the summary prompt — I'm using a vanilla Claude-Haiku instruction with no chain-of-thought and I'm not sure if there's a meaningful quality win from re-doing it with a longer model.

Try it: https://yepits.ai

---

**Posting checklist:**
- Title in url form: `Show HN: I bypassed YouTube's transcript captcha-wall using the Android InnerTube client`
- Submit between 8am–10am US Eastern on Tue/Wed/Thu
- Have the link `https://yepits.ai/?utm_source=hn&utm_medium=social&utm_campaign=launch_v2` ready (with UTM, for analytics)
- Don't reply to top-voted critical comments with marketing replies. Reply with technical substance or thanks.
- If the post tanks in 30 min, do NOT delete and repost. Let it die and learn from comments.
- DO NOT mention a Chrome extension. There isn't a published one. (Old draft mentioned it. Removed.)
