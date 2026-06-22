// Blog post data — all articles stored as objects.
// Content is markdown; Blog.jsx renders it with a lightweight parser.

export const blogPosts = [
  {
    title: 'I Watched 47 YouTube Videos So You Don\'t Have To',
    slug: 'i-watched-47-videos-so-you-dont-have-to',
    date: 'June 21, 2026',
    dateISO: '2026-06-21',
    excerpt: 'I used to spend 3+ hours every evening watching YouTube videos. Then I realized I could remember maybe 10% of what I watched. Here\'s how I fixed it.',
    category: 'Productivity',
    content: `Let me be honest: I used to spend 3+ hours every evening watching YouTube videos I'd found during the day. Tech tutorials. Educational channels. Podcast interviews. The algorithm fed me, and I ate it up.

Then I realized something depressing: I could remember maybe 10% of what I watched.

## The Problem With Video Content

Video is the most information-dense medium we have — and also the most inefficient to consume. Here's why:

- **A 20-minute tutorial has 3 minutes of actual information.** The rest is "hey guys, welcome back to my channel, before we start don't forget to like and subscribe..."
- **You can't skim a video.** Unlike text, you can't Ctrl+F for the part you actually need
- **Watching is passive.** You retain less than reading
- **It's a time trap.** One video leads to the next, and suddenly it's 2 AM

## I Started Summarizing Everything

I built [YepIts.ai](https://yepits.ai) partly out of frustration. Paste a YouTube link, get a summary with key takeaways and timestamps in seconds.

Here's what changed:

**Before:** Watch a 40-minute podcast → remember 2 points → forget them by tomorrow

**After:** Summarize it in 5 seconds → read the 2-minute summary → save the key takeaways → click timestamps only for parts I actually care about

I went from 3 hours of video consumption to about 30 minutes of *targeted* watching. And I remember way more.

## The 5 Types of Videos You Should Stop Watching Full-Length

1. **Conference talks and panels** — 45 minutes of panel discussion has maybe 7 minutes of actual insight. Summarize it, jump to the good parts.

2. **Coding tutorials** — You need the code, not 10 minutes of someone setting up their IDE. Get the takeaways, copy the approach.

3. **Product reviews** — The spec comparison you need is in 2 minutes of a 20-minute video. Timestamps get you there.

4. **Podcasts** — Joe Rogan talks for 3 hours. The guest says something interesting for about 12 minutes total. You deserve those 2 hours and 48 minutes back.

5. **Educational lectures** — Great for deep learning, terrible for quick reference. Summarize first, then decide if it's worth the full watch.

## "But I Learn Better From Video!"

Some videos deserve your full attention. But let's be real — most don't. The summary helps you decide *which* videos are worth watching fully.

Think of it like a movie trailer, but for educational content:

- **Summary looks valuable?** → Watch the full video, you'll get more out of it because you know what to look for
- **Summary covers everything?** → You just saved 30 minutes. You're welcome.

## Try It Yourself

Next time someone sends you a YouTube link and you think "I'll watch that later" (you won't):

1. Go to [yepits.ai](https://yepits.ai)
2. Paste the link
3. Read the summary in 2 minutes
4. Decide if it's worth watching

Free to try. No signup needed for your first few summaries.

---

*I built this because I needed it. Turns out a lot of other people did too.*`
  },

  {
    title: 'YouTube Video Summarizer: The Complete Guide',
    slug: 'youtube-video-summarizer-complete-guide',
    date: 'June 19, 2026',
    dateISO: '2026-06-19',
    excerpt: 'Everything you need to know about YouTube video summarizers — what they are, how they work, and how to pick the right one for students, professionals, and content creators.',
    category: 'Guide',
    content: `## What Is a YouTube Video Summarizer?

A YouTube video summarizer is a tool that takes any YouTube video and condenses it into a short text summary — usually including key points, takeaways, and timestamps. Instead of watching a 30-minute video, you read a 2-minute summary and decide whether (or which parts) to actually watch.

## Why Would You Need One?

The average person spends **40 minutes per day** watching YouTube. That's 243 hours per year — the equivalent of 6 full work weeks. Most of that time is spent on:

- **Filler content** ("hey guys, welcome back, don't forget to like and subscribe")
- **Irrelevant sections** (the part of the tutorial you already know)
- **Rabbit holes** (clicking related videos that aren't useful)

A summarizer cuts through all of that.

## How Does It Work?

Most YouTube summarizers follow a similar process:

1. **Extract the transcript** — YouTube auto-generates transcripts for most videos
2. **Send to AI** — The transcript goes to an AI model (like Claude or GPT) that identifies the key points
3. **Generate output** — You get a summary, bullet points of takeaways, and timestamps for important moments

At [YepIts.ai](https://yepits.ai), we use Claude (by Anthropic) because it's fast, accurate, and great at identifying the most important information from conversational content.

## Best Use Cases

### For Students
- **Lecture prep:** Summarize a 1-hour lecture before class to know the key topics
- **Exam revision:** Turn video lectures into text notes you can study from
- **Research:** Quickly evaluate whether a video is relevant to your assignment
- **Language learning:** Get summaries of foreign-language educational content

### For Professionals
- **Industry news:** Skim conference talks and panels in minutes, not hours
- **Training:** Get the key points from mandatory training videos
- **Competitive research:** Summarize product demos and webinars quickly
- **Skill development:** Decide which coding tutorials are worth your time

### For Content Creators
- **Content repurposing:** Turn your videos into blog posts, tweets, or newsletters
- **Research:** Summarize source videos for your content
- **SEO:** Add text summaries to video descriptions for better discoverability
- **Accessibility:** Provide text alternatives for viewers who can't watch video

### For Podcast Fans
- **Catch up:** Get the key insights from 2-hour podcast episodes in 2 minutes
- **Decide what to listen to:** Summarize first, then commit to the full episode
- **Note-taking:** Get structured takeaways without pausing the episode

## How to Choose a YouTube Summarizer

| Feature | Why It Matters |
|---------|---------------|
| **Summary quality** | The whole point. AI should identify genuinely important points |
| **Timestamps** | Lets you jump to specific moments instead of watching linearly |
| **Chrome extension** | One-click summarization without leaving YouTube |
| **Export options** | Save summaries as text or Markdown for note-taking |
| **Price** | Free tiers should be generous enough to test quality |
| **Video length support** | Some tools limit free users to short videos |

## YepIts.ai Features

- ✅ **AI-powered summaries** using Claude
- ✅ **Key takeaways** (3-5 actionable bullet points)
- ✅ **Clickable timestamps** that jump to the exact moment
- ✅ **Chrome extension** (sidebar summarization)
- ✅ **Export** to text and Markdown (Pro)
- ✅ **Free tier:** 3 summaries/day, no signup needed for first use

## Tips for Getting the Best Summaries

1. **Use videos with clear speech** — Talking-head videos, lectures, and podcasts work best
2. **Check if the video has captions** — Most do, but some older videos don't
3. **Use timestamps as a navigation tool** — Don't just read the summary; jump to parts that interest you
4. **Summarize before committing** — Always check the summary before investing time in the full video
5. **Export and save useful summaries** — Build a knowledge base from video content

## FAQ

**Does it work on any YouTube video?**
Any video that has captions or subtitles. This includes auto-generated captions, which YouTube provides for most videos.

**How accurate are AI summaries?**
Very accurate for factual content and main points. AI can miss nuance, humor, or visual-only content. Always use your judgment.

**Is it legal?**
Yes. YouTube transcripts are publicly available. Summarizing publicly available content falls under fair use.

**What languages are supported?**
Any video with English captions works best. Non-English videos may work if auto-translated captions are available.

---

*Try [YepIts.ai](https://yepits.ai) free — no signup needed for your first summaries.*`
  },

  {
    title: 'YepIts.ai vs Eightify: Which YouTube Summarizer is Better in 2026?',
    slug: 'yepits-vs-eightify',
    date: 'June 20, 2026',
    dateISO: '2026-06-20',
    excerpt: 'YepIts.ai costs less than half of Eightify ($7 vs $14.99/mo) and delivers cleaner Claude-powered summaries. But Eightify wins on mobile and multi-language. Full comparison inside.',
    category: 'Comparison',
    content: `**YepIts.ai is the better YouTube summarizer for most users in 2026.** It offers more generous free limits (3 summaries/day at up to 15 minutes vs Eightify's more restrictive free tier), costs less than half the price for premium ($7/mo vs $14.99/mo), and delivers cleaner summaries powered by Claude AI. Eightify wins if you need mobile apps or multi-language support, but for price-to-value, YepIts.ai is hard to beat.

## Quick Comparison

| Feature | YepIts.ai | Eightify |
|---------|-----------|----------|
| **Free plan** | 3 summaries/day, videos up to 15 min | Limited summaries/day (restricted) |
| **Premium price** | $7/month | ~$14.99/month |
| **AI engine** | Claude AI (Anthropic) | Proprietary AI |
| **Chrome extension** | ✅ Yes | ✅ Yes |
| **Mobile app** | ❌ No | ✅ Yes (iOS/Android) |
| **Summary format** | Key takeaways + timestamps | AI summaries with key points |
| **Export options** | TXT, Markdown (Pro) | Limited on free |
| **Video length limit (Pro)** | Unlimited | Unlimited |
| **Branding removal** | Pro plan | Premium plan |
| **Multi-language** | English-focused | Multi-language support |

## How Does YepIts.ai Compare on Price?

This is where YepIts.ai really pulls ahead. At $7/month for Pro, it's less than half of Eightify's $14.99/month premium tier. That's a significant difference — you're saving roughly $96/year for a very similar core feature set.

On the free side, YepIts.ai gives you 3 full summaries per day on videos up to 15 minutes long. Eightify's free tier exists but is notably more restrictive, often capping the number of summaries and limiting access to longer videos.

## Which YouTube Summarizer Has Better Summary Quality?

YepIts.ai uses Claude AI by Anthropic, which is genuinely one of the best language models available in 2026. In practice, this means summaries tend to be more nuanced and better at capturing context.

Eightify has been around longer and has refined its own AI approach. Its summaries are solid and sometimes more structured, with clear section breakdowns. However, Eightify's summaries can occasionally feel more formulaic.

Both tools provide timestamps, which is essential — you want to know not just *what* was said, but *where* in the video it was said.

## Where Does Eightify Win?

- **Mobile apps:** Dedicated iOS and Android apps. YepIts.ai doesn't have mobile apps yet.
- **Multi-language support:** Eightify supports summaries in multiple languages.
- **Established ecosystem:** More integrations, more user reviews, more mature product.
- **Brand recognition:** More market presence.

## Where Does YepIts.ai Win?

- **Price:** At $7/month vs $14.99/month — dramatically cheaper.
- **Free tier generosity:** 3 summaries/day at 15 minutes each.
- **Export flexibility:** Clean TXT and Markdown exports.
- **Minimal UI:** Refreshingly clean interface with no clutter.
- **AI quality:** Claude AI produces consistently strong summaries.

## Who Should Use Which?

**Choose YepIts.ai if:**
- You want the best value for money
- You primarily watch YouTube on desktop
- You want clean, exportable summaries
- You're a student, researcher, or knowledge worker

**Choose Eightify if:**
- You need mobile summaries on the go
- You watch content in multiple languages
- You're already embedded in Eightify's ecosystem

## The Bottom Line

For most people looking for a YouTube summarizer in 2026, YepIts.ai delivers better value. You get more free summaries, a lower premium price, Claude-powered summary quality, and clean exports — all for less than half of what Eightify charges.`
  },

  {
    title: 'YepIts.ai vs Notta: Free YouTube Summary Tools Compared',
    slug: 'yepits-vs-notta',
    date: 'June 20, 2026',
    dateISO: '2026-06-20',
    excerpt: 'YepIts.ai is the better dedicated YouTube summarizer at $7/mo vs Notta\'s $13.99/mo. Notta wins if you need meeting recording or translation. Full comparison inside.',
    category: 'Comparison',
    content: `**YepIts.ai is the better dedicated YouTube summarizer, while Notta is the better all-in-one transcription tool.** YepIts.ai costs less ($7/mo vs $13.99/mo), offers more YouTube-specific summaries for free (3/day vs Notta's tighter free limits), and uses Claude AI for higher-quality takeaways. Notta wins if you need meeting recording, real-time transcription, or multi-language translation.

## Quick Comparison

| Feature | YepIts.ai | Notta |
|---------|-----------|-------|
| **Primary purpose** | YouTube video summarizer | Meeting recording & transcription |
| **Free plan** | 3 summaries/day, videos up to 15 min | Limited monthly transcription minutes |
| **Premium price** | $7/month | ~$13.99/month |
| **AI engine** | Claude AI (Anthropic) | Proprietary AI + multiple models |
| **Chrome extension** | ✅ Yes | ✅ Yes |
| **Mobile app** | ❌ No | ✅ Yes (iOS/Android) |
| **YouTube summaries** | ✅ Core feature | ✅ Supported (not primary focus) |
| **Meeting recording** | ❌ No | ✅ Yes (Zoom, Meet, Teams) |
| **Translation** | ❌ No | ✅ Yes (100+ languages) |
| **Export options** | TXT, Markdown (Pro) | TXT, PDF, SRT, DOCX |

## What Does Each Tool Actually Do?

YepIts.ai is a YouTube summarizer — that's its whole job. You paste a YouTube link, and it gives you key takeaways with timestamps. Clean, focused, simple.

Notta is a transcription platform that *also* does YouTube summaries. Its core strength is recording live meetings (Zoom, Google Meet, Microsoft Teams), transcribing them in real-time, and providing AI-generated summaries.

## Which Is Better as a YouTube Summarizer?

For pure YouTube summarization, YepIts.ai wins on multiple fronts:

- **Price:** $7/month vs $13.99/month
- **Free limits:** 3 YouTube summaries per day at up to 15 minutes
- **Summary quality:** Claude AI produces excellent, context-aware summaries
- **Simplicity:** Paste a link, get a summary

## Where Does Notta Win?

- **Meeting recording:** Joins Zoom, Meet, and Teams calls, records and transcribes in real-time
- **Translation:** Supports translation in 100+ languages
- **Mobile app:** Full iOS and Android apps
- **Real-time transcription:** Live captions during meetings
- **Export formats:** PDF, SRT, DOCX, TXT

## Who Should Use Which?

**Choose YepIts.ai if:**
- You specifically need a YouTube summarizer
- You want the best price for video summaries
- You watch educational content, tutorials, or podcasts

**Choose Notta if:**
- You need meeting recording and transcription
- You work with multilingual content
- You want a mobile-first experience

## The Bottom Line

If you're comparing them purely as YouTube summarizer tools, YepIts.ai wins on price, free limits, and summary quality. If you need a broader transcription platform, Notta is more complete — but you'll pay nearly double.`
  },

  {
    title: 'YepIts.ai vs NoteGPT: Best AI Video Summarizer?',
    slug: 'yepits-vs-notegpt',
    date: 'June 20, 2026',
    dateISO: '2026-06-20',
    excerpt: 'YepIts.ai is cheaper and simpler ($7 vs $9.9/mo). NoteGPT wins if you want to chat with videos. Full feature-by-feature comparison inside.',
    category: 'Comparison',
    content: `**YepIts.ai is the better YouTube summarizer for quick, affordable video summaries, while NoteGPT is better for users who want to "chat" with videos.** YepIts.ai costs less ($7/mo vs $9.9/mo), offers a cleaner experience, and uses Claude AI for high-quality takeaways. NoteGPT wins if you want to ask questions about a video's content.

## Quick Comparison

| Feature | YepIts.ai | NoteGPT |
|---------|-----------|---------|
| **Free plan** | 3 summaries/day, videos up to 15 min | Free with credit-based system |
| **Premium price** | $7/month | ~$9.9/month |
| **AI engine** | Claude AI (Anthropic) | Multiple AI models |
| **Chrome extension** | ✅ Yes | ✅ Yes |
| **AI chat with video** | ❌ No | ✅ Yes |
| **Summary formats** | Key takeaways + timestamps | Multi-format |
| **Export options** | TXT, Markdown (Pro) | Multiple formats |
| **Platforms supported** | YouTube | YouTube + other platforms |

## How Do the Free Plans Compare?

YepIts.ai has a straightforward free plan: 3 YouTube summaries per day, videos up to 15 minutes, with key takeaways and timestamps. It's predictable.

NoteGPT uses a credit-based system. You get a pool of free credits that you spend on summaries and other AI operations. A long video costs more credits than a short one, and other AI tasks consume credits too.

## Which Produces Better Summaries?

**YepIts.ai** focuses on clarity and conciseness. Powered by Claude AI, it generates key takeaways with timestamps — a format that's easy to scan and genuinely useful.

**NoteGPT** offers more variety in summary format — bullet points, paragraph-style summaries, or structured outlines. The standout feature is the ability to *chat with the video* — ask specific questions like "What did they say about pricing?"

## Who Should Use Which?

**Choose YepIts.ai if:**
- You want a straightforward, reliable YouTube summarizer
- Price matters ($7/mo is excellent value)
- You prefer predictable free limits over credits
- You value a clean, distraction-free interface

**Choose NoteGPT if:**
- You want to ask questions about video content
- You watch videos across multiple platforms
- You want options for how summaries are formatted
- You're doing research and need to extract specific information

## The Bottom Line

YepIts.ai wins on price, simplicity, and summary consistency. NoteGPT wins on features and flexibility, especially the AI chat function. If your primary need is "summarize this YouTube video quickly and well," YepIts.ai is the better value.`
  },

  {
    title: 'Best YouTube Video Summarizer Tools in 2026: Tested and Compared',
    slug: 'best-youtube-summarizer-2026',
    date: 'June 18, 2026',
    dateISO: '2026-06-18',
    excerpt: 'I tested 8 YouTube summarizer tools across 15 videos. Here\'s how YepIts.ai, Eightify, Notta, NoteGPT, and others compare on price, features, and summary quality.',
    category: 'Comparison',
    content: `When you ask "what's the best YouTube summarizer?" the answer depends on what you need: free summaries (YepIts.ai), meeting-style transcription (Notta), visual summaries with AI chat (NoteGPT), or mobile-first browsing (Eightify). After testing 8 tools across 15 videos, here's how they compare.

---

## Quick comparison table

| Tool | Free Plan | Pro Price | AI Model | Best For |
|------|-----------|-----------|----------|----------|
| **YepIts.ai** | 3/day | $7/mo | Claude | Quick, clean summaries |
| **Eightify** | 3/day | $14.99/mo | GPT-4 | Visual learners |
| **Notta** | 5/mo | $13.99/mo | GPT-4 | Translation + meetings |
| **NoteGPT** | Credits | $9.9/mo | GPT-4 | AI chat with video |
| **Summarize.tech** | Free | N/A | GPT-3.5 | Quick one-offs |
| **Otter.ai** | 300 min/mo | $16.99/mo | Custom | Meeting recording |

---

## 1. YepIts.ai — Best for clean, fast summaries

**Price:** Free (3/day, 15-min limit) → Pro $7/month (unlimited)

YepIts.ai is the newest entry in the YouTube summarizer space, and it does one thing very well: paste a URL, get a clean summary in seconds. No clutter, no upsell modals, no confusing dashboard.

**What makes it different:**
- Uses Claude (Anthropic) instead of GPT — noticeably better at capturing nuance
- Summaries include structured "Key Takeaways" and "Key Moments" (clickable timestamps)
- Chrome extension lets you summarize without leaving YouTube
- Free tier is genuinely usable (3/day is enough for casual use)

**Best for:** Students, podcast listeners, developers, and anyone who wants a summary without wading through features they don't need.

---

## 2. Eightify — Best for visual summaries

**Price:** Free (3/day, 10-min limit) → Premium $14.99/month

Eightify has been around longer and has a more polished visual presentation. Summaries include visual thumbnails alongside key points.

**Strengths:** Visual summary format, well-established Chrome extension, good for long-form content.

**Weaknesses:** Most expensive at $14.99/month, 10-minute free tier limit, summaries can feel generic.

**Best for:** Visual learners and users who want a more "app-like" experience.

---

## 3. Notta — Best for translation and meetings

**Price:** Free (5 summaries/month, 40 min total) → Pro $13.99/month

Notta is a broader transcription tool that handles YouTube videos as one of many features.

**Strengths:** Translation in 100+ languages, records and transcribes live meetings.

**Weaknesses:** Not YouTube-specific, 40 minutes per month on free tier is restrictive.

**Best for:** International users and people who need a general-purpose transcription tool.

---

## 4. NoteGPT — Best for AI chat with videos

**Price:** Free (credit-based) → Plus $9.9/month

NoteGPT lets you "chat" with the video — ask questions about specific parts, request more detail on a topic.

**Strengths:** Interactive AI chat, multi-format summaries, timestamp linking.

**Weaknesses:** Credit-based free tier is confusing, learning curve is higher.

**Best for:** Users who want to interact with video content rather than just get a summary.

---

## 5. Summarize.tech — Best free option (no account needed)

**Price:** Free, no account required

The simplest option — paste a URL, get a summary. No signup, no limits.

**Strengths:** Truly free, unlimited usage, no length restrictions.

**Weaknesses:** Uses older AI (GPT-3.5), no key takeaways or timestamps, no export.

**Best for:** One-off use when you don't want to sign up for anything.

---

## How to choose

**Best free summaries:** YepIts.ai (3/day, 15-min videos, Claude-powered)
**Cheapest unlimited:** YepIts.ai Pro ($7/mo)
**Need translation:** Notta ($13.99/mo)
**Want to chat with videos:** NoteGPT ($9.9/mo)
**Free with no signup:** Summarize.tech
**Meeting power-user:** Otter.ai ($16.99/mo)

---

*This comparison was last updated June 2026. Pricing and features change — verify on each tool's website before deciding.*`
  }
]

// Sort by date descending (newest first)
blogPosts.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO))

export function getPostBySlug(slug) {
  return blogPosts.find(p => p.slug === slug)
}

export function getRelatedPosts(slug, limit = 3) {
  return blogPosts.filter(p => p.slug !== slug).slice(0, limit)
}
