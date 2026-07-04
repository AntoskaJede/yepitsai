import React, { useState } from 'react';

export default function Compare({ onReset }) {
  const [url1, setUrl1] = useState('');
  const [url2, setUrl2] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCompare = async (e) => {
    e.preventDefault();
    if (!url1.trim() || !url2.trim()) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url1: url1.trim(), url2: url2.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not compare videos.');
        return;
      }
      setResult(data);
    } catch (err) {
      setError('Failed to connect. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const { video1, video2, similarity } = result;
    return (
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-text mb-8 text-center">
          Comparison: {similarity}% similar
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Video 1 */}
          <div className="card">
            <h2 className="text-lg font-bold text-slate-text mb-2">{video1.title}</h2>
            {video1.channel && <p className="text-sm text-slate-dim mb-4">{video1.channel}</p>}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-indigo-500 uppercase mb-2">Summary</h3>
                <p className="text-sm text-slate-muted leading-relaxed">{video1.summary}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-indigo-500 uppercase mb-2">Key Points</h3>
                <ul className="text-sm text-slate-muted space-y-1">
                  {video1.takeaways?.slice(0, 3).map((t, i) => (
                    <li key={i}>• {t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Video 2 */}
          <div className="card">
            <h2 className="text-lg font-bold text-slate-text mb-2">{video2.title}</h2>
            {video2.channel && <p className="text-sm text-slate-dim mb-4">{video2.channel}</p>}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-indigo-500 uppercase mb-2">Summary</h3>
                <p className="text-sm text-slate-muted leading-relaxed">{video2.summary}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-indigo-500 uppercase mb-2">Key Points</h3>
                <ul className="text-sm text-slate-muted space-y-1">
                  {video2.takeaways?.slice(0, 3).map((t, i) => (
                    <li key={i}>• {t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button onClick={onReset} className="btn-secondary">
            Compare more videos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-text mb-4 text-center">
        Compare two videos
      </h1>
      <p className="text-slate-muted text-center mb-8">
        See how much two videos overlap in their key ideas.
      </p>

      <form onSubmit={handleCompare} className="space-y-4 mb-6">
        <div>
          <label className="label">First YouTube URL</label>
          <input
            type="text"
            value={url1}
            onChange={(e) => setUrl1(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="input"
            autoFocus
          />
        </div>

        <div>
          <label className="label">Second YouTube URL</label>
          <input
            type="text"
            value={url2}
            onChange={(e) => setUrl2(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="input"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Comparing...' : 'Compare videos'}
        </button>
      </form>

      <button onClick={onReset} className="text-sm text-slate-dim hover:text-slate-muted">
        Back to summarizer
      </button>
    </div>
  );
}
