# YepIts.ai — 7-day Launch Calendar
**Locked pricing:** Free = 3/day, videos ≤15 min. Pro = $7/mo. (See `PRICING.md`.)

## Day numbering convention
Day 0 = Tuesday (today, launch day for Product Hunt + first Reddit drop). Days count forward from there in CET (your timezone). 

| Day | Calendar | Window (CET) | What goes out | Where | CTA / URL |
|---|---|---|---|---|---|
| **0** | Tue | 03:00 PT (12:01am PT) → live | PH goes live | Product Hunt | `?utm_source=producthunt&utm_medium=social&utm_campaign=launch_v2` |
| **0** | Tue | 12:00 CET | Maker comment on PH | PH comments | n/a |
| **0** | Tue | 17:00 CET | r/productivity post (revised) | Reddit | `?utm_source=reddit_productivity&utm_medium=social&utm_campaign=launch_v2` |
| **1** | Wed | 09:00 CET | TikTok/Reels — Idea 3 (Student hack) | TikTok + IG Reels | bio link → `?utm_source=tiktok&utm_medium=social&utm_campaign=launch_v2` |
| **1** | Wed | 17:00 CET | r/studytips post (revised) | Reddit | `?utm_source=reddit_studytips&utm_medium=social&utm_campaign=launch_v2` |
| **1** | Wed | 22:00 CET | HN Show post (revised — InnerTube-led title) | Hacker News | `?utm_source=hn&utm_medium=social&utm_campaign=launch_v2` |
| **2** | Thu | 09:00 CET | TikTok/Reels — Idea 2 (POV) | TikTok + IG Reels | bio link |
| **2** | Thu | 17:00 CET | r/SaaS post (revised — retro) | Reddit | `?utm_source=reddit_saas&utm_medium=social&utm_campaign=launch_v2` |
| **3** | Fri | 09:00 CET | TikTok/Reels — Idea 5 (calculator) | TikTok + IG Reels | bio link |
| **3** | Fri | 17:00 CET | r/webdev post (InnerTube technical) | Reddit | `?utm_source=reddit_webdev&utm_medium=social&utm_campaign=launch_v2` |
| **4** | Sat | 09:00 CET | TikTok/Reels — Idea 4 (Does it work?) | TikTok + IG Reels | bio link |
| **4** | Sat | 17:00 CET | r/Entrepreneur post (revised) | Reddit | `?utm_source=reddit_entrepreneur&utm_medium=social&utm_campaign=launch_v2` |
| **5** | Sun | 17:00 CET | TikTok/Reels — Idea 1 (Hook) | TikTok + IG Reels | bio link |
| **5** | Sun | evening | Forum reply to aitalkboard (if thread live) | Forum | `?utm_source=forum_aitalkboard&utm_medium=social&utm_campaign=launch_v2` |
| **6** | Mon | 09:00 CET | PH "thank you" tweet + share top Reddit comment | Twitter + Reddit | n/a |

## Why this cadence

1. **PH first, anything else second.** Product Hunt traffic peaks for the first 4–6 hours after launch; if you post Reddit at the same moment you split attention. Tuesday is the strongest PH day historically (least competition from Mon launches).
2. **Posts spread across 5 days, never more than 1/day per channel.** Reddit auto-mod flags "coordinated cross-posting" if multiple subs get hit in 24h.
3. **TikTok/Reels at consistent 5/9h times** so the algorithm learns your schedule.
4. **HN goes last in the Reddit cluster** — HN dislikes anything that looks like it just landed on Product Hunt, so we let 24h pass.
5. **Forum reply goes last.** Lower-priority channel, and we want the reddit signal first to learn what real users actually say before we re-use copy.

## Skip-if (do not post if)

- A post already exists on that subreddit in the last 7 days from your account (Reddit shadow-bans serial reposters)
- Server is unhealthy (check `curl https://yepits.ai/?utm_source=ping -o /dev/null -w "%{http_code}"` returns 200)
- AI costs > 1.5× normal in the last 24h (means a post did really well — double-check abuse isn't following)

## Day-of responsibilities (split across your timezones)

- **You (Pava):** Post copy-paste + first-comment reply within 2h
- **Toto (me):** Monitor logs, flag any failed posts, draft replies to top-voted comments on Day 1, Day 2, Day 3 if asked
