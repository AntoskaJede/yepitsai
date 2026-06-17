import React, { useState, useEffect } from 'react';

export default function Landing({ onSummarize, user }) {
  const [url, setUrl] = useState('');

  // Auto-fill from URL param (Chrome extension / shared links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    if (urlParam) {
      setUrl(urlParam);
      // Auto-scroll to the input
      setTimeout(() => {
        const input = document.querySelector('input[placeholder="Paste YouTube URL..."]');
        if (input) input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    let cleanUrl = trimmed;
    if (!cleanUrl.startsWith('http')) {
      if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
        cleanUrl = `https://www.youtube.com/watch?v=${cleanUrl}`;
      } else {
        cleanUrl = `https://${cleanUrl}`;
      }
    }
    onSummarize(cleanUrl);
  };

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="text-center max-w-2xl mx-auto mb-24">
        <div className="inline-block mb-6">
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
            Free to try
          </span>
        </div>
        <h1 className="text-5xl sm:text-6xl font-black text-slate-text mb-5 leading-[1.05] tracking-tight">
          Watch less.<br />
          <span className="accent">Learn more.</span>
        </h1>
        <p className="text-lg text-slate-muted mb-8 max-w-md mx-auto leading-relaxed">
          Paste any YouTube link and get an instant AI summary with key takeaways and timestamps.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube URL..."
            className="input flex-1 text-base"
            autoFocus
            autoComplete="off"
          />
          <button type="submit" className="btn-primary text-base whitespace-nowrap px-8">
            Summarize
          </button>
        </form>

        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-dim">
          <span>No credit card required</span>
          <span className="text-slate-border-dark">/</span>
          <span>3 free summaries per day</span>
          <span className="text-slate-border-dark">/</span>
          <span>Instant results</span>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto mb-24">
        <h2 className="text-center text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-10">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-indigo-500 font-bold text-lg">1</span>
            </div>
            <h3 className="font-semibold text-slate-text mb-1.5">Paste a link</h3>
            <p className="text-sm text-slate-muted leading-relaxed">Drop in any YouTube URL — a lecture, podcast, tutorial, or talk.</p>
          </div>
          <div className="card text-center">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-indigo-500 font-bold text-lg">2</span>
            </div>
            <h3 className="font-semibold text-slate-text mb-1.5">Get a summary</h3>
            <p className="text-sm text-slate-muted leading-relaxed">AI reads the transcript and distills it into clear, concise paragraphs.</p>
          </div>
          <div className="card text-center">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-indigo-500 font-bold text-lg">3</span>
            </div>
            <h3 className="font-semibold text-slate-text mb-1.5">Skip to what matters</h3>
            <p className="text-sm text-slate-muted leading-relaxed">Jump straight to the key moments with clickable timestamps.</p>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="max-w-4xl mx-auto mb-24">
        <h2 className="text-center text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-10">
          Built for people who value time
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card-light">
            <h3 className="font-semibold text-slate-text mb-1">Students</h3>
            <p className="text-sm text-slate-muted">Summarize 2-hour lectures into 2-minute reads before exams.</p>
          </div>
          <div className="card-light">
            <h3 className="font-semibold text-slate-text mb-1">Podcast fans</h3>
            <p className="text-sm text-slate-muted">Catch up on episodes you don't have time to listen to fully.</p>
          </div>
          <div className="card-light">
            <h3 className="font-semibold text-slate-text mb-1">Researchers</h3>
            <p className="text-sm text-slate-muted">Scan conference talks and panels in seconds to find what's relevant.</p>
          </div>
          <div className="card-light">
            <h3 className="font-semibold text-slate-text mb-1">Newsletter writers</h3>
            <p className="text-sm text-slate-muted">Pull key points and quotes from video sources without watching them.</p>
          </div>
          <div className="card-light">
            <h3 className="font-semibold text-slate-text mb-1">Marketers</h3>
            <p className="text-sm text-slate-muted">Extract insights from webinars and industry talks in seconds.</p>
          </div>
          <div className="card-light">
            <h3 className="font-semibold text-slate-text mb-1">Curious minds</h3>
            <p className="text-sm text-slate-muted">Learn from more videos in less time. Simple as that.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-3xl mx-auto mb-24">
        <h2 className="text-center text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-10">
          Pricing
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-bold text-lg text-slate-text mb-1">Free</h3>
            <p className="text-sm text-slate-muted mb-4">For trying it out</p>
            <p className="text-3xl font-black text-slate-text mb-4">$0<span className="text-base font-normal text-slate-dim">/mo</span></p>
            <ul className="text-sm text-slate-muted space-y-2 mb-6">
              <li>3 summaries per day</li>
              <li>Videos up to 15 minutes</li>
              <li>Key takeaways and timestamps</li>
            </ul>
          </div>
          <div className="card ring-1 ring-indigo-100 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Most popular
            </span>
            <h3 className="font-bold text-lg text-slate-text mb-1">Pro</h3>
            <p className="text-sm text-slate-muted mb-4">For power users</p>
            <p className="text-3xl font-black text-slate-text mb-4">$7<span className="text-base font-normal text-slate-dim">/mo</span></p>
            <ul className="text-sm text-slate-muted space-y-2 mb-6">
              <li>Unlimited summaries</li>
              <li>Videos of any length</li>
              <li>Export to text and Markdown</li>
              <li>No branding</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto mb-24">
        <h2 className="text-center text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-10">
          Questions
        </h2>
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-slate-text mb-1.5">How accurate are the summaries?</h3>
            <p className="text-sm text-slate-muted leading-relaxed">Summaries are generated from the video's transcript using AI. They capture the main points accurately, but always watch the original for nuance and context on important topics.</p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-slate-text mb-1.5">Does it work on every YouTube video?</h3>
            <p className="text-sm text-slate-muted leading-relaxed">It works on any video that has captions or subtitles (either auto-generated or manual). Most videos on YouTube qualify.</p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-slate-text mb-1.5">What languages are supported?</h3>
            <p className="text-sm text-slate-muted leading-relaxed">Currently English transcripts. More languages coming soon.</p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-slate-text mb-1.5">Is there a limit on free tier?</h3>
            <p className="text-sm text-slate-muted leading-relaxed">Yes — 3 summaries per day, videos up to 15 minutes. That covers most quick tutorials, shorts, and clips. Pro removes all limits.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center max-w-xl mx-auto">
        <h2 className="text-3xl font-black text-slate-text mb-3">
          Stop watching. Start learning.
        </h2>
        <p className="text-slate-muted mb-6">
          Your time is worth more than a 40-minute video.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube URL..."
            className="input flex-1 text-base"
            autoComplete="off"
          />
          <button type="submit" className="btn-primary text-base whitespace-nowrap px-8">
            Summarize
          </button>
        </form>
      </section>
    </div>
  );
}
