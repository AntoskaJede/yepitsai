# Chrome Web Store listing — YepIts.ai (v2.1.0)

Developer console: https://chrome.google.com/webstore/devconsole/ (one-time $5 fee if not yet paid).
Upload `dist/yepitsai-extension-2.1.0.zip` from `./extension/build.sh`.

## Store listing

**Name**
YepIts.ai — YouTube Summarizer

**Summary** (132 chars max)
Summarize any YouTube video in seconds. Key takeaways and clickable timestamps in a side panel. Free, no account needed.

**Description**
Stop watching 40-minute videos for 5 minutes of useful information.

YepIts.ai turns any YouTube video into a 2-minute read. Click "Summarize with AI" under any video and get, right in Chrome's side panel:

- A concise summary in 2-3 short paragraphs
- Key takeaways you can act on
- Clickable timestamps that jump the video to the moment that matters
- A shareable page for every summary

No account needed. Everyone gets 3 free summaries a day. Sign in to keep your history across devices, or go Pro ($7/month) for unlimited summaries and videos of any length.

Perfect for:
- Students skimming lecture recordings before exams
- Podcast listeners catching up on 3-hour episodes over coffee
- Developers skipping intros and sponsor reads to get to the code
- Researchers pulling key points from talks and interviews

How it works:
1. Open any YouTube video
2. Click "Summarize with AI" next to the like button
3. Read the summary in the side panel while the video stays open
4. Click a timestamp to jump there

Summaries are generated from the video's captions using Claude AI. Videos without captions can't be summarized on the free plan.

By installing this extension you agree to the Terms of Service (https://yepits.ai/terms) and Privacy Policy (https://yepits.ai/privacy).

**Category:** Productivity
**Language:** English
**Homepage:** https://yepits.ai
**Support:** pava@yepits.ai
**Privacy policy URL:** https://yepits.ai/privacy

## Single purpose
Summarize the YouTube video the user is watching, using its publicly available captions, and display the result in the side panel.

## Permission justifications

**activeTab** — Read the URL of the YouTube tab the user is on so the correct video is summarized when they click the button.

**storage** — Keep the user signed in between sessions (a session token) and remember their last 10 summaries locally. No browsing history is stored.

**sidePanel** — Show the summary in Chrome's side panel so the user can read it while the video keeps playing.

**scripting** — When the user clicks a timestamp in the summary, seek the YouTube player on the current tab to that time. Nothing else on the page is read or modified.

**host_permissions `*://*.youtube.com/*`** — Insert the "Summarize with AI" button on watch pages and detect the current video.

**host_permissions `https://yepits.ai/*`** — Send the video URL to the YepIts.ai API and receive the summary; sign-in and billing calls. No other hosts are contacted.

## Remote code
No. All code ships in the package; the extension only exchanges JSON with yepits.ai.

## Data usage disclosures

Collected:
- **Authentication information** — email and password only if the user chooses to create an account.
- **Website content** — the YouTube video URL the user asks to summarize.

Not collected: browsing history, location, personal communications, financial data (payments are handled on Stripe's site), health data, or user activity such as clicks and keystrokes.

Certifications (check all three):
- Data is not sold to third parties.
- Data is not used or transferred for purposes unrelated to the extension's single purpose.
- Data is not used or transferred to determine creditworthiness or for lending purposes.

If asked about third parties: video captions are sent to Anthropic's Claude API to generate the summary. The YepIts.ai server records that a summary was requested and which video, for usage limits and product statistics. No advertising or third-party analytics SDKs run in the extension.

## Screenshots (1280x800)
Generated files in `dist/store/`:
1. `01-summary.png` — YouTube watch page with the button, side panel showing a finished summary
2. `02-takeaways.png` — side panel scrolled to takeaways and timestamps
3. `03-ready.png` — side panel before summarizing, showing the free-tier counter
4. `04-loading.png` — progress steps while summarizing
5. `05-limit.png` — daily limit reached, with sign-in and Pro options

Promo tile (440x280) in `dist/store/promo-440x280.png`.
