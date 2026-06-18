import React, { useState } from 'react';

export default function Summary({ data, onReset }) {
  const { title, channel, duration, summary, takeaways, timestamps, videoId, proRequired, remaining, limit } = data;
  const [copied, setShowCopied] = useState(false);

  const handleCopy = () => {
    const text = [
      `${title}`,
      `${channel ? 'By ' + channel : ''}`,
      '',
      'SUMMARY',
      summary,
      '',
      'KEY TAKEAWAYS',
      ...takeaways.map((t, i) => `${i + 1}. ${t}`),
      '',
      'KEY MOMENTS',
      ...timestamps.map(ts => `${ts.time} — ${ts.label}`),
      '',
      'Summarized with YepIts.ai',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleDownload = (format) => {
    const lines = [
      `# ${title}`,
      channel ? `*By ${channel}*\n` : '',
      '## Summary\n',
      summary,
      '\n## Key Takeaways\n',
      ...takeaways.map((t, i) => `${i + 1}. ${t}`),
      '\n## Key Moments\n',
      ...timestamps.map(ts => `- **${ts.time}** — ${ts.label}`),
      '\n---\n*Summarized with [YepIts.ai](https://yepits.ai)*',
    ];
    const content = format === 'md' ? lines.join('\n') : lines.join('\n').replace(/[#*_-]/g, '').replace(/\[.*?\]\(.*?\)/g, 'YepIts.ai');
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `summary-${videoId || 'video'}.${format === 'md' ? 'md' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (proRequired) {
    return <ProRequired duration={duration} onReset={onReset} />;
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Video info */}
      <div className="mb-8 text-center">
        {videoId && (
          <div className="mb-6 rounded-xl overflow-hidden border border-slate-border shadow-md">
            <div className="relative aspect-video bg-black">
              <img
                src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                }}
              />
            </div>
          </div>
        )}
        <h1 className="text-2xl font-bold text-slate-text mb-1 leading-tight">{title}</h1>
        {channel && <p className="text-sm text-slate-dim">{channel}</p>}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between mb-6">
        {remaining !== undefined && (
          <span className="text-sm text-slate-dim font-medium">
            {remaining > 0 ? `${remaining} of ${limit} free summaries left today` : 'No free summaries left today'}
          </span>
        )}
        <div className="flex gap-2 ml-auto">
          <button onClick={() => handleDownload('txt')} className="btn-secondary text-sm py-2 px-3" title="Download as text">
            .txt
          </button>
          <button onClick={() => handleDownload('md')} className="btn-secondary text-sm py-2 px-3" title="Download as Markdown">
            .md
          </button>
          <button onClick={handleCopy} className="btn-secondary text-sm py-2 px-3 flex items-center gap-1.5">
            {copied ? (
              <>
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-3">Summary</h2>
          <div className="text-slate-muted leading-relaxed space-y-3">
            {summary.split('\n').map((para, i) => (
              para.trim() && <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      )}

      {/* Key Takeaways */}
      {takeaways && takeaways.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-3">Key Takeaways</h2>
          <ul className="space-y-2">
            {takeaways.map((point, i) => (
              <li key={i} className="flex gap-3 text-slate-muted leading-relaxed">
                <span className="text-indigo-500 font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Timestamps */}
      {timestamps && timestamps.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-3">Key Moments</h2>
          <div className="space-y-2">
            {timestamps.map((ts, i) => (
              <a
                key={i}
                href={`https://www.youtube.com/watch?v=${videoId}&t=${ts.seconds}s`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 items-start p-2 -mx-2 rounded-lg hover:bg-mist-dim transition-colors group"
              >
                <span className="text-sm font-mono font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded flex-shrink-0">
                  {ts.time}
                </span>
                <span className="text-sm text-slate-muted group-hover:text-slate-text">{ts.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Pro nudge — subtle */}
      {remaining !== undefined && remaining <= 1 && (
        <div className="card-light mb-6 text-center">
          <p className="text-sm text-slate-muted">
            {remaining === 0
              ? "You've used all your free summaries for today. "
              : "This was your last free summary for today. "}
            <span className="text-indigo-500 font-medium">Upgrade to Pro</span> for unlimited summaries and longer videos.
          </p>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-slate-dim mb-6">
        Summarized with YepIts.ai
      </p>

      {/* Actions */}
      <div className="text-center">
        <button onClick={onReset} className="btn-secondary">
          Summarize another video
        </button>
      </div>
    </div>
  );
}

function ProRequired({ duration, onReset }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), source: 'pro_waitlist' }),
      });
    } catch {}
    setSubmitted(true);
  };

  const handleUpgrade = async () => {
    try {
      const token = localStorage.getItem('yepits_token');
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Stripe not configured yet — fall back to email capture
        handleSubmit(e);
      }
    } catch {
      setSubmitted(true);
    }
  };

  return (
    <div className="w-full max-w-xl text-center">
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-slate-text mb-3">This video is {duration} minutes long</h2>
        <p className="text-slate-muted mb-6 leading-relaxed">
          Free summaries cover videos up to 15 minutes. Upgrade to Pro for unlimited video length and summaries.
        </p>

        {submitted ? (
          <div className="bg-mist-dim rounded-lg p-6 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-slate-text mb-1">You're on the list</p>
            <p className="text-sm text-slate-muted">We'll email you when Pro launches with 50% off your first month.</p>
          </div>
        ) : (
          <>
            <button onClick={handleUpgrade} className="btn-primary w-full mb-3">
              Upgrade to Pro — $7/month
            </button>
            <div className="bg-mist-dim rounded-lg p-4 mb-6 text-left">
              <p className="font-semibold text-slate-text mb-1">Pro includes</p>
              <ul className="text-sm text-slate-muted space-y-1">
                <li>Unlimited video length</li>
                <li>Unlimited summaries</li>
                <li>Export to text and Markdown</li>
                <li>No branding</li>
              </ul>
            </div>
            <p className="text-sm text-slate-dim mb-2">Not ready yet? Get notified at launch:</p>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input flex-1"
                required
              />
              <button type="submit" className="btn-secondary whitespace-nowrap text-sm">
                Notify me
              </button>
            </form>
          </>
        )}

        <button onClick={onReset} className="text-sm text-slate-dim hover:text-slate-muted transition-colors mt-4">
          Try a shorter video
        </button>
      </div>
    </div>
  );
}
