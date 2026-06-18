import React, { useState } from 'react';

export default function Auth({ mode: initialMode, onAuth, onClose }) {
  const [mode, setMode] = useState(initialMode || 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'signup' && !agreed) {
      setError('Please accept the Terms and Privacy Policy to continue.');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setLoading(false);
        return;
      }
      localStorage.setItem('yepits_token', data.token);
      onAuth(data.user);
    } catch (err) {
      setError('Failed to connect. Is the server running?');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-slate-border shadow-xl max-w-sm w-full p-8" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-slate-text mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="text-sm text-slate-muted mb-6">
          {mode === 'login' ? 'Sign in to continue summarizing.' : 'Start summarizing videos in seconds.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder="At least 6 characters"
              required
              minLength="6"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {mode === 'signup' && (
            <label className="flex items-start gap-2 text-xs text-slate-muted">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5"
                required
              />
              <span>
                I agree to the{' '}
                <a href="/terms" target="_blank" className="text-indigo-500 hover:underline">Terms of Service</a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" className="text-indigo-500 hover:underline">Privacy Policy</a>.
              </span>
            </label>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-slate-muted text-center mt-5">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            className="text-indigo-500 font-medium hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
