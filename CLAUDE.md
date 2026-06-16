# TL;DR Video — Project Brief

## What this is
A tool where you paste a YouTube URL and get an instant, clean summary with key takeaways and timestamps.

## Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- AI: Anthropic Claude (claude-haiku-4-5 for speed/cost)
- YouTube: youtube-transcript npm package (free, no API key needed)
- Hosting: Railway (later)

## Design — match AskFred's aesthetic EXACTLY
This is critical. The design must feel calming, premium, and clean.

### Colors (Tailwind config):
```
cream: #f8f6f1 (main background)
cream-dark: #f0eee6
forest-50: rgba(45,106,79,0.08)
forest-100: rgba(45,106,79,0.15)
forest-500: #2d6a4f (primary buttons, accents)
forest-600: #245a42 (hover)
forest-700: #1d4e3a
warm-border: #e0ddd5
warm-border-dark: #d4d0c8
warm-surface: #faf9f5
```

### Font: Inter (Google Fonts)

### Style principles:
- NO emojis anywhere in the UI
- Cream background (#f8f6f1)
- White cards with warm borders
- Forest green primary buttons
- Rounded corners (rounded-xl)
- Subtle, calming, lots of whitespace
- Clean typography hierarchy
- Mobile responsive

## Features to build (MVP):

### 1. Landing page (/)
- Large centered input: "Paste YouTube URL..."
- Below input: "Summarize" button (forest green)
- Below: brief tagline "Turn any video into a 2-minute read"
- Header with logo text "TL;DR Video" (left), no nav needed yet
- Footer: "Made with care"

### 2. Results page (/summary)
- Shows: Video title, channel name, duration
- Clean summary section (2-3 paragraphs)
- Key Takeaways section (bullet points)
- Timestamps section (clickable, jump to video)
- "Summarize another video" button at bottom
- Loading state while processing (calming spinner or pulse animation)

### 3. Backend API
- POST /api/summarize
  - Body: { url: "youtube url" }
  - Fetches transcript via youtube-transcript package
  - Sends to Claude for summarization
  - Returns: { title, channel, summary, takeaways: [], timestamps: [] }
- Rate limiting: 3 requests/hour for anonymous users (IP-based)

### 4. Free tier limit
- Videos under 10 minutes = free
- Videos over 10 minutes = show "Pro required" message (no payment yet, just the gate)

## API keys
- Anthropic: Use process.env.ANTHROPIC_API_KEY
- For local dev, create .env with ANTHROPIC_API_KEY

## DO NOT add:
- Authentication/signup
- Payment/Stripe
- User accounts
- Emojis in UI
- Dark mode
- Complex navigation

Keep it ONE page with a result view. Dead simple. The magic is: paste link, get summary.

## File structure:
```
frontend/
  src/
    App.jsx
    main.jsx
    index.css
    components/
      Landing.jsx
      Summary.jsx
      Loading.jsx
  index.html
  tailwind.config.js
  vite.config.js
  package.json
server/
  index.js
  package.json
```
