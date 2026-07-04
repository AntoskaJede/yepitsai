import React, { useState, useEffect } from 'react';
import Landing from './components/Landing.jsx';
import Summary from './components/Summary.jsx';
import Loading from './components/Loading.jsx';
import Auth from './components/Auth.jsx';
import CookieBanner from './components/CookieBanner.jsx';
import Compare from './components/Compare.jsx';

export default function App() {
  const [view, setView] = useState('landing');
  const [summaryData, setSummaryData] = useState(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('yepits_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setUser(data);
          else localStorage.removeItem('yepits_token');
        })
        .catch(() => localStorage.removeItem('yepits_token'));
    }
  }, []);

  const handleSummarize = async (url) => {
    setView('loading');
    setError('');
    try {
      const token = localStorage.getItem('yepits_token');
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 && data.limitReached) {
          setError('You\'ve used your 3 free summaries for today. Sign in to upgrade to Pro for unlimited.');
          setShowAuth('login');
        } else {
          setError(data.error || 'Something went wrong. Please try again.');
        }
        setView('error');
        return;
      }
      setSummaryData(data);
      setView('summary');
    } catch (err) {
      setError('Failed to connect. Is the server running?');
      setView('error');
    }
  };

  const handleReset = () => {
    setSummaryData(null);
    setError('');
    setView('landing');
  };

  const handleLogout = () => {
    localStorage.removeItem('yepits_token');
    setUser(null);
    setView('landing');
    setSummaryData(null);
  };

  const handleAuth = (userData) => {
    setUser(userData);
    setShowAuth(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} onLogout={handleLogout} onLogin={() => setShowAuth('login')} />
      <main className="flex-1 flex flex-col items-center px-4 py-12">
        {view === 'landing' && <Landing onSummarize={handleSummarize} user={user} onCompare={() => setView('compare')} />}
        {view === 'loading' && <Loading />}
        {view === 'summary' && summaryData && (
          <Summary data={summaryData} onReset={handleReset} />
        )}
        {view === 'compare' && (
          <Compare onReset={handleReset} />
        )}
        {view === 'error' && (
          <div className="w-full max-w-xl text-center">
            <p className="text-slate-muted mb-4">{error}</p>
            <button onClick={handleReset} className="btn-secondary">
              Try again
            </button>
          </div>
        )}
      </main>
      <Footer />
      <CookieBanner />

      {showAuth && (
        <Auth
          mode={showAuth}
          onAuth={handleAuth}
          onClose={() => setShowAuth(null)}
        />
      )}
    </div>
  );
}

function Header({ user, onLogout, onLogin }) {
  return (
    <header className="w-full border-b border-slate-border bg-white/70 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
            <span className="text-white font-black text-sm">T</span>
          </div>
          <span className="font-bold text-lg text-slate-text tracking-tight">
            YepIts.ai
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-slate-muted">{user.email}</span>
              <button onClick={onLogout} className="text-sm text-slate-dim hover:text-slate-muted transition-colors">
                Sign out
              </button>
            </>
          ) : (
            <button onClick={onLogin} className="text-sm font-medium text-indigo-500 hover:text-indigo-600 transition-colors">
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-border bg-white/50">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-dim">© 2026 YepIts.ai</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <a href="/privacy" className="text-slate-dim hover:text-indigo-500 transition-colors">Privacy</a>
          <a href="/terms" className="text-slate-dim hover:text-indigo-500 transition-colors">Terms</a>
          <a href="/cookies" className="text-slate-dim hover:text-indigo-500 transition-colors">Cookies</a>
          <a href="/refund" className="text-slate-dim hover:text-indigo-500 transition-colors">Refunds</a>
          <a href="/dmca" className="text-slate-dim hover:text-indigo-500 transition-colors">DMCA</a>
          <a href="mailto:pava@yepits.ai" className="text-slate-dim hover:text-indigo-500 transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
