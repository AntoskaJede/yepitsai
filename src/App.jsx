import { useState, useEffect } from 'react'
import { BlogList, BlogPost } from './Blog'

const API = ''

function App() {
  const [token, setToken] = useState(localStorage.getItem('yepits_token') || '')
  const [user, setUser] = useState(null)
  const [view, setView] = useState('landing')
  const [blogSlug, setBlogSlug] = useState('')
  const [summaryData, setSummaryData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authMode, setAuthMode] = useState('login')

  useEffect(() => {
    const path = window.location.pathname
    if (path === '/terms') setView('terms')
    else if (path === '/privacy') setView('privacy')
  }, [])

  useEffect(() => {
    if (token) {
      fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` }})
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) { setUser(d.user); } })
        .catch(() => { localStorage.removeItem('yepits_token'); setToken('') })
    }
  }, [token])

  const handleSummarize = async (url) => {
    setError('')
    setLoading(true)
    setSummaryData(null)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch(`${API}/api/summarize`, { method: 'POST', headers, body: JSON.stringify({ url }) })
      const data = await res.json()
      if (!res.ok) {
        if (data.needsAuth) { setAuthMode('signup'); setView('auth'); setError('Sign in to continue summarizing.') }
        else if (data.tooLong) { setView('tooLong'); setSummaryData({ duration: data.duration }) }
        else { setError(data.error || 'Something went wrong. Try again.') }
      } else {
        setSummaryData(data); setView('result')
      }
    } catch { setError('Network error. Check your connection.') } finally { setLoading(false) }
  }

  const handleAuth = async (email, password, acceptTerms) => {
    setError('')
    const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login'
    const body = authMode === 'signup' ? { email, password, acceptTerms } : { email, password }
    const res = await fetch(`${API}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Authentication failed.'); return false }
    localStorage.setItem('yepits_token', data.token); setToken(data.token); setUser(data.user); setView('landing'); return true
  }

  const handleLogout = () => { localStorage.removeItem('yepits_token'); setToken(''); setUser(null); setView('landing') }

  const handleUpgrade = async () => {
    if (!token) { setAuthMode('signup'); setView('auth'); return }
    try {
      const res = await fetch(`${API}/api/create-checkout-session`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch { setError('Could not start checkout. Try again.') }
  }

  const navigateToBlogPost = (slug) => { setBlogSlug(slug); setView('blog-post'); window.scrollTo({ top: 0 }) }
  const navigateToBlog = () => { setView('blog'); window.scrollTo({ top: 0 }) }

  return (
    <div className="min-h-screen">
      <Header user={user} onLogin={() => { setAuthMode('login'); setView('auth') }} onSignup={() => { setAuthMode('signup'); setView('auth') }} onLogout={handleLogout} onUpgrade={handleUpgrade} onBlog={navigateToBlog} />

      {view === 'landing' && <Landing onSummarize={handleSummarize} loading={loading} error={error} user={user} />}
      {view === 'result' && summaryData && <SummaryView data={summaryData} onReset={() => setView('landing')} />}
      {view === 'tooLong' && <TooLongView duration={summaryData?.duration} onUpgrade={handleUpgrade} onReset={() => setView('landing')} user={user} />}
      {view === 'auth' && <AuthView mode={authMode} setMode={setAuthMode} onAuth={handleAuth} error={error} onClose={() => { setView('landing'); setError('') }} />}
      {view === 'landing' && <PricingSection onUpgrade={handleUpgrade} />}
      {view === 'landing' && <FAQSection />}
      {(view === 'terms' || view === 'privacy') && (
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <button onClick={() => setView('landing')} className="text-sm text-ink-faint hover:text-clay transition-colors">← Back to YepIts.ai</button>
        </div>
      )}
      {view === 'terms' && <TermsView />}
      {view === 'privacy' && <PrivacyView />}
      {view === 'blog' && <BlogList onNavigate={navigateToBlogPost} />}
      {view === 'blog-post' && <BlogPost slug={blogSlug} onNavigate={(slug) => slug === 'blog' ? navigateToBlog() : navigateToBlogPost(slug)} />}
      <Footer onNavigate={setView} />
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────
const Icon = {
  Bolt: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Arrow: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Play: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8 5v14l11-7z"/></svg>,
  Check: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  Minus: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" {...p}><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  GradCap: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3L1 9l11 6 9-4.91V17"/><path d="M5 13.18V17c0 1.5 3 3 7 3s7-1.5 7-3v-3.82"/></svg>,
  Waveform: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12h2M7 8v8M11 4v16M15 8v8M19 12h2"/></svg>,
  Code: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="8 9 4 13 8 17"/><polyline points="16 9 20 13 16 17"/><line x1="13" y1="7" x2="11" y2="17"/></svg>,
  Flag: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4v16M4 4h13l-2 4 2 4H4"/></svg>,
}

// ─── Header ───────────────────────────────────────────
function Header({ user, onLogin, onSignup, onLogout, onUpgrade, onBlog }) {
  return (
    <header className="sticky top-0 z-20 bg-cream/85 backdrop-blur-md border-b border-cream-300">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-clay flex items-center justify-center text-white font-extrabold text-sm -rotate-3">Y</div>
            <span className="font-extrabold text-ink text-xl">YepIts.ai</span>
          </a>
          <button onClick={onBlog} className="text-sm text-ink-muted hover:text-clay transition-colors hidden sm:inline font-medium">Blog</button>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-ink-faint hidden sm:inline">{user.email}</span>
              {user.plan === 'pro' ? (
                <span className="text-xs font-bold text-moss bg-moss-soft px-2 py-0.5 rounded-md">PRO</span>
              ) : (
                <button onClick={onUpgrade} className="text-sm font-bold text-clay hover:text-clay-light bg-clay-soft px-3 py-1.5 rounded-lg transition-all">Upgrade to Pro →</button>
              )}
              <button onClick={onLogout} className="text-sm text-ink-muted hover:text-ink transition-colors">Sign out</button>
            </>
          ) : (
            <>
              <button onClick={onLogin} className="text-sm text-ink-muted hover:text-clay transition-colors font-medium">Sign in</button>
              <button onClick={onSignup} className="bg-ink text-cream font-semibold text-sm px-5 py-2 rounded-full hover:opacity-90 transition-opacity">Try free</button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

// ─── Landing ─────────────────────────────────────────
function Landing({ onSummarize, loading, error, user }) {
  const [url, setUrl] = useState('')
  const [showEmptyError, setShowEmptyError] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (!url.trim()) { setShowEmptyError(true); setTimeout(() => setShowEmptyError(false), 2000); return }
    onSummarize(url.trim())
  }

  return (
    <>
      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 pt-20 pb-12">
        <span className="inline-flex items-center gap-2 bg-clay-soft text-clay px-3.5 py-1.5 rounded-full text-sm font-semibold mb-6">
          <Icon.Bolt className="w-3.5 h-3.5" /> No sign-up needed
        </span>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-ink leading-[1.05] mb-5">
          Don't watch a{' '}
          <span className="italic" style={{ background: 'linear-gradient(120deg, #FF4F00, #FF8C42)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            40-minute video
          </span>{' '}
          to learn 3 things.
        </h1>
        <p className="text-xl text-ink-muted max-w-xl leading-relaxed mb-9">
          Paste any YouTube link. Get the key points, takeaways, and timestamps in seconds. Like CliffsNotes, but for video.
        </p>

        {/* Input */}
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Paste YouTube URL..."
            className="input flex-1 text-base"
            style={{ outline: showEmptyError ? '2px solid #ef4444' : 'none', outlineOffset: '2px' }}
            autoFocus
          />
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            {loading ? 'Summarizing...' : <>Summarize <Icon.Arrow className="w-4 h-4" /></>}
          </button>
        </form>

        {showEmptyError && <p className="mt-2 text-sm text-red-500">Paste a YouTube link first</p>}

        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-faint">
          <span className="w-2 h-2 rounded-full bg-moss" />
          Free — 3 summaries/day. No account needed.
        </div>

        <button onClick={() => { setUrl('https://www.youtube.com/watch?v=8jPQjjsBbIc'); }}
          className="mt-3 block mx-auto text-sm text-ink-faint hover:text-clay transition-colors underline">
          or try with a TED talk →
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="max-w-2xl mx-auto px-6 pb-12 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-[3px] border-clay-soft" />
              <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-clay animate-spin" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-ink mb-1">Summarizing...</h2>
          <p className="text-sm text-ink-faint">Reading the transcript and extracting key points.</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="max-w-xl mx-auto px-6 pb-8">
          <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4 text-sm text-red-500">{error}</div>
        </div>
      )}

      {/* Demo Preview */}
      {!loading && (
        <div className="max-w-2xl mx-auto px-6 pb-20">
          <p className="text-center text-sm font-semibold text-ink-faint uppercase tracking-wide mb-4">This is what you get</p>
          <div className="bg-white border-2 border-ink rounded-2xl p-7" style={{ boxShadow: '8px 8px 0 #FF4F00' }}>
            {/* Video row */}
            <div className="flex items-center gap-3.5 mb-6 pb-6 border-b border-cream-300">
              <div className="w-20 h-12 bg-ink rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon.Play className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-ink text-[15px]">How Great Leaders Inspire Action — Simon Sinek</p>
                <p className="text-[13px] text-ink-faint">TED Talk • 17 min → 45 second read</p>
              </div>
            </div>
            {/* Summary */}
            <p className="text-xs font-bold text-clay uppercase tracking-wide mb-2">Summary</p>
            <p className="text-[15px] text-ink-muted leading-relaxed mb-5">
              Simon Sinek explains that inspiring leaders communicate differently — they start with "why" (purpose) instead of "what" (product). His Golden Circle model explains why Apple, MLK, and the Wright Brothers could inspire while others with better resources couldn't.
            </p>
            {/* Takeaways */}
            <p className="text-xs font-bold text-clay uppercase tracking-wide mb-2">Key Takeaways</p>
            <ul className="space-y-2 mb-5">
              {['People don\'t buy what you do — they buy why you do it', 'The Golden Circle: Why (purpose) → How (process) → What (product)', 'Apple starts with "think different," not "we make computers"'].map((t, i) => (
                <li key={i} className="flex gap-2.5 text-[14px] text-ink-muted items-start">
                  <span className="w-[22px] h-[22px] rounded-md bg-clay-soft flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon.Minus className="w-3 h-3 text-clay" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            {/* Timestamps */}
            <p className="text-xs font-bold text-clay uppercase tracking-wide mb-2">Jump to</p>
            <div className="flex flex-wrap gap-2">
              {['02:15 — Golden Circle model', '06:40 — Apple example', '11:20 — Wright Brothers'].map((t, i) => (
                <span key={i} className="font-mono text-xs bg-cream border border-cream-300 px-2.5 py-1 rounded-md text-ink-muted">{t}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Use Cases — dark section */}
      <div className="bg-ink text-cream py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">For people who watch<br />too many videos.</h2>
          <p className="text-ink-faint text-lg mb-12">Sound like you?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: <Icon.GradCap className="w-[26px] h-[26px] text-white" />, color: '#FF4F00', title: 'Students', desc: 'Skim lecture videos before exams instead of rewatching the entire 2-hour recording.' },
              { icon: <Icon.Waveform className="w-[26px] h-[26px] text-white" />, color: '#7C3AED', title: 'Podcast listeners', desc: 'Catch up on 3-hour episodes during your coffee break. Get the gist, skip the filler.' },
              { icon: <Icon.Code className="w-[26px] h-[26px] text-white" />, color: '#0D9488', title: 'Developers', desc: 'Skip the 10-minute intros and sponsorship plugs. Jump straight to the code.' },
              { icon: <Icon.Flag className="w-[26px] h-[26px] text-white" />, color: '#EC4899', title: 'Researchers', desc: 'Pull key points from interviews, documentaries, and talks without watching them.' },
            ].map((uc, i) => (
              <div key={i} className="bg-ink-light rounded-2xl p-7 border border-white/10 transition-all hover:border-clay hover:-translate-y-1">
                <div className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center mb-4" style={{ background: uc.color }}>
                  {uc.icon}
                </div>
                <h3 className="font-bold text-lg mb-1.5">{uc.title}</h3>
                <p className="text-sm text-ink-faint leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Summary Result View ──────────────────────────────
function SummaryView({ data, onReset }) {
  const { title, summary, keyTakeaways, keyMoments, videoId, remaining } = data
  const handleExport = (format) => {
    let content = `# ${title}\n\n## Summary\n${summary}\n`
    if (keyTakeaways?.length) content += `\n## Key Takeaways\n${keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
    if (keyMoments?.length) content += `\n## Key Moments\n${keyMoments.map(m => `[${m.time}] ${m.label}`).join('\n')}\n`
    const blob = new Blob([content], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `summary-${videoId || 'video'}.${format === 'md' ? 'md' : 'txt'}`
    a.click()
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {title && <h1 className="text-xl font-bold text-ink mb-6">{title}</h1>}
      {summary && (
        <div className="card mb-6">
          <h2 className="text-xs font-bold text-clay uppercase tracking-wide mb-3">Summary</h2>
          <p className="text-ink-muted leading-relaxed whitespace-pre-line">{summary}</p>
        </div>
      )}
      {keyTakeaways?.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-xs font-bold text-clay uppercase tracking-wide mb-3">Key Takeaways</h2>
          <ul className="space-y-2">
            {keyTakeaways.map((t, i) => (
              <li key={i} className="flex gap-2.5 text-ink-muted leading-relaxed items-start">
                <span className="w-[22px] h-[22px] rounded-md bg-clay-soft flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon.Minus className="w-3 h-3 text-clay" />
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {keyMoments?.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-xs font-bold text-clay uppercase tracking-wide mb-3">Key Moments</h2>
          <div className="space-y-2">
            {keyMoments.map((m, i) => (
              <a key={i} href={`https://www.youtube.com/watch?v=${videoId}&t=${m.seconds}s`} target="_blank" rel="noopener noreferrer"
                className="flex gap-3 items-start p-2 -mx-2 rounded-lg hover:bg-cream transition-colors group">
                <span className="font-mono text-xs font-bold text-clay bg-clay-soft px-2 py-1 rounded-md flex-shrink-0">{m.time}</span>
                <span className="text-sm text-ink-muted group-hover:text-ink">{m.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      {remaining !== undefined && remaining <= 1 && (
        <div className="card-light mb-6 text-center">
          <p className="text-sm text-ink-muted">
            {remaining === 0 ? "You've used all your free summaries for today. " : "This was your last free summary for today. "}
            <span className="text-clay font-medium cursor-pointer" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>Upgrade to Pro</span>
            {' '}for unlimited summaries and longer videos.
          </p>
        </div>
      )}
      <p className="text-center text-xs text-ink-faint mb-6">Summarized with YepIts.ai</p>
      <div className="text-center">
        <button onClick={onReset} className="btn-secondary">Summarize another video</button>
      </div>
    </div>
  )
}

// ─── Too Long View ────────────────────────────────────
function TooLongView({ duration, onUpgrade, onReset, user }) {
  return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-ink mb-3">This video is {duration} minutes long</h2>
        <p className="text-ink-muted mb-6 leading-relaxed">
          Free summaries cover videos up to 15 minutes. Upgrade to Pro for unlimited video length and summaries.
        </p>
        <button onClick={onUpgrade} className="btn-primary w-full mb-4">Upgrade to Pro — $7/month</button>
        <div className="bg-cream rounded-xl p-4 text-left">
          <p className="font-bold text-ink mb-1">Pro includes:</p>
          <ul className="text-sm text-ink-muted space-y-1">
            <li>• Unlimited video length</li><li>• Unlimited summaries</li><li>• Export to text and Markdown</li><li>• No branding</li>
          </ul>
        </div>
      </div>
      <button onClick={onReset} className="text-sm text-ink-faint hover:text-ink transition-colors">Try a shorter video</button>
    </div>
  )
}

// ─── Auth View ────────────────────────────────────────
function AuthView({ mode, setMode, onAuth, error, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(true)
  const [localError, setLocalError] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setLocalError('')
    if (mode === 'signup' && !acceptTerms) { setLocalError('Please accept the Terms and Privacy Policy to continue.'); return }
    await onAuth(email.toLowerCase().trim(), password, acceptTerms)
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 border-2 border-ink" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-ink">{mode === 'signup' ? 'Sign up' : 'Sign in'}</h2>
          <button onClick={onClose} className="text-ink-faint hover:text-ink text-xl">✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-ink mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-ink mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" required minLength="8" />
          </div>
          {mode === 'signup' && (
            <label className="flex items-start gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-1 w-4 h-4 rounded text-clay focus:ring-clay" />
              <span className="text-sm text-ink-muted">I agree to the <a href="/terms" target="_blank" rel="noopener" className="text-clay hover:underline">Terms</a> and <a href="/privacy" target="_blank" rel="noopener" className="text-clay hover:underline">Privacy Policy</a></span>
            </label>
          )}
          {(error || localError) && <div className="mb-4 text-sm text-red-500 bg-red-50 rounded-lg p-3">{error || localError}</div>}
          <button type="submit" className="btn-primary w-full">{mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        </form>
        <div className="text-center mt-6 text-sm text-ink-faint">
          {mode === 'signup' ? (<>Already have an account? <button onClick={() => setMode('login')} className="text-clay hover:underline font-semibold">Sign in</button></>)
          : (<>New here? <button onClick={() => setMode('signup')} className="text-clay hover:underline font-semibold">Sign up</button></>)}
        </div>
      </div>
    </div>
  )
}

// ─── Pricing ──────────────────────────────────────────
function PricingSection({ onUpgrade }) {
  return (
    <section className="max-w-3xl mx-auto px-6 py-20">
      <h2 className="text-4xl sm:text-5xl font-extrabold text-ink text-center mb-3 tracking-tight">Stupid simple pricing.</h2>
      <p className="text-center text-ink-muted text-lg mb-12">No hidden fees. No "contact sales." Just paste a link.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white border-2 border-cream-300 rounded-2xl p-8">
          <h3 className="text-lg font-bold text-ink mb-1">Free</h3>
          <p className="text-4xl font-extrabold text-ink mb-5">$0</p>
          <ul className="space-y-2 mb-6">
            {['No sign-up needed', '3 summaries per day', 'Videos up to 15 minutes', 'Key takeaways & timestamps'].map((f, i) => (
              <li key={i} className="flex gap-2.5 items-center text-sm text-ink-muted">
                <span className="w-[22px] h-[22px] rounded-md bg-moss-soft flex items-center justify-center flex-shrink-0">
                  <Icon.Check className="w-3 h-3 text-moss" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <button onClick={onUpgrade} className="btn-secondary w-full text-center block">Start summarizing</button>
        </div>
        <div className="bg-white border-2 border-clay rounded-2xl p-8 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-clay text-white text-xs font-bold px-3.5 py-1 rounded-full">PRO</div>
          <h3 className="text-lg font-bold text-ink mb-1">Pro</h3>
          <p className="text-4xl font-extrabold text-ink mb-5">$7<span className="text-base font-normal text-ink-faint">/mo</span></p>
          <ul className="space-y-2 mb-6">
            {['Unlimited summaries', 'Any video length', 'Export to .txt / .md', 'No branding', 'Priority processing'].map((f, i) => (
              <li key={i} className="flex gap-2.5 items-center text-sm text-ink-muted">
                <span className="w-[22px] h-[22px] rounded-md bg-moss-soft flex items-center justify-center flex-shrink-0">
                  <Icon.Check className="w-3 h-3 text-moss" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <button onClick={onUpgrade} className="btn-primary w-full">Upgrade →</button>
        </div>
      </div>
    </section>
  )
}

// ─── FAQ ──────────────────────────────────────────────
function FAQSection() {
  const faqs = [
    { q: 'How much does it cost?', a: 'Free: 3 summaries per day for videos up to 15 minutes. Pro: $7/month for unlimited summaries, any video length, export options, and no branding.' },
    { q: 'Is there a Chrome extension?', a: 'Yes! The YepIts.ai extension adds a button to any YouTube video. Click it and the summary appears in a side panel — no copy-pasting URLs.' },
    { q: 'How accurate are the summaries?', a: "Very. We use Claude (by Anthropic) to analyze the full transcript and extract the most important points. It works best on talking-head videos, lectures, and podcasts where there's clear speech." },
    { q: 'What languages are supported?', a: "Any video that has captions or subtitles (either auto-generated or manual). Most YouTube videos qualify. The summary is generated in English regardless of the video language." },
    { q: 'Is my data stored?', a: "We store your email and which videos you've summarized (for usage tracking). We don't store the actual video content. Your summaries are not shared with anyone." },
    { q: 'Can I export my summaries?', a: 'Yes — Pro users can export to plain text or Markdown format with one click.' },
    { q: 'Does it work on podcasts?', a: 'Absolutely. Podcasts are actually one of the best use cases — get the key points of a 2-hour episode in seconds.' }
  ]
  const [open, setOpen] = useState(null)
  return (
    <section className="max-w-2xl mx-auto px-6 py-16">
      <h2 className="text-3xl font-extrabold text-ink text-center mb-8">FAQ</h2>
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <div key={i} className="card cursor-pointer" onClick={() => setOpen(open === i ? null : i)}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink">{f.q}</h3>
              <span className="text-ink-faint text-xl">{open === i ? '−' : '+'}</span>
            </div>
            {open === i && <p className="mt-3 text-sm text-ink-muted leading-relaxed">{f.a}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────
function Footer({ onNavigate }) {
  return (
    <footer className="border-t border-cream-300 mt-12">
      <div className="max-w-5xl mx-auto px-6 py-6 text-center">
        <p className="text-sm text-ink-faint mb-2">© 2026 YepIts.ai · Made by a human. <span className="text-clay">Powered by AI.</span></p>
        <div className="flex gap-4 justify-center text-sm text-ink-faint">
          <button onClick={() => onNavigate('blog')} className="hover:text-ink transition-colors">Blog</button>
          <button onClick={() => onNavigate('terms')} className="hover:text-ink transition-colors">Terms</button>
          <button onClick={() => onNavigate('privacy')} className="hover:text-ink transition-colors">Privacy</button>
        </div>
      </div>
    </footer>
  )
}

// ─── Terms ────────────────────────────────────────────
function TermsView() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-extrabold text-ink mb-6">Terms of Service</h1>
      <div className="space-y-4 text-ink-muted leading-relaxed">
        <p className="text-sm text-ink-faint">Last updated: June 19, 2026</p>
        <div><h2 className="text-lg font-bold text-ink mb-2">1. Acceptance of Terms</h2><p>By using YepIts.ai, you agree to these terms. If you don't agree, don't use the service.</p></div>
        <div><h2 className="text-lg font-bold text-ink mb-2">2. Service Description</h2><p>YepIts.ai provides AI-generated summaries of YouTube videos. Summaries are generated by AI and may not be perfectly accurate. Use your own judgment.</p></div>
        <div><h2 className="text-lg font-bold text-ink mb-2">3. Free and Pro Plans</h2><p>Free accounts get 3 summaries per day for videos up to 15 minutes. Pro accounts ($7/month) get unlimited summaries and features. You can cancel Pro anytime.</p></div>
        <div><h2 className="text-lg font-bold text-ink mb-2">4. Acceptable Use</h2><p>Don't abuse the service, create multiple accounts to bypass limits, scrape data, or use the service for anything illegal. We may suspend accounts that violate these terms.</p></div>
        <div><h2 className="text-lg font-bold text-ink mb-2">5. Privacy</h2><p>We store your email and usage data. See our <a href="/privacy" className="text-clay hover:underline">Privacy Policy</a> for details.</p></div>
        <div><h2 className="text-lg font-bold text-ink mb-2">6. Limitation of Liability</h2><p>YepIts.ai is provided "as is" without warranties. We're not liable for any damages arising from use of the service.</p></div>
        <div><h2 className="text-lg font-bold text-ink mb-2">7. Changes</h2><p>We may update these terms from time to time. Continued use after changes means you accept the new terms.</p></div>
        <div><h2 className="text-lg font-bold text-ink mb-2">8. Contact</h2><p>Questions? Email <a href="mailto:pava@askfred.app" className="text-clay hover:underline">pava@askfred.app</a></p></div>
      </div>
    </div>
  )
}

// ─── Privacy ─────────────────────────────────────────
function PrivacyView() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-extrabold text-ink mb-6">Privacy Policy</h1>
      <div className="space-y-4 text-ink-muted leading-relaxed">
        <p className="text-sm text-ink-faint">Last updated: June 19, 2026</p>
        <div><h2 className="text-lg font-bold text-ink mb-2">What We Collect</h2><p><strong>Email address</strong> — when you sign up.</p><p><strong>Usage data</strong> — which videos you summarize (stored as video IDs) and how often you use the service.</p><p><strong>IP address</strong> — hashed and used only for rate limiting and abuse prevention. We don't store raw IPs.</p></div>
        <div><h2 className="text-lg font-bold text-ink mb-2">What We Do With It</h2><p>We use your email to authenticate you and notify you about your account. We use usage data to enforce plan limits and improve the service. That's it. No selling data, no third-party ad tracking.</p></div>
        <div><h2 className="text-lg font-bold text-ink mb-2">Payments</h2><p>Payment processing is handled by Stripe. We don't see or store your card details — Stripe does.</p></div>
        <div><h2 className="text-lg font-bold text-ink mb-2">AI Processing</h2><p>Video transcripts are sent to Anthropic (Claude) for summarization. Anthropic's data retention is governed by their <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener" className="text-clay hover:underline">privacy policy</a>.</p></div>
        <div><h2 className="text-lg font-bold text-ink mb-2">Data Retention</h2><p>Your account data is kept as long as your account is active. You can request deletion by emailing us.</p></div>
        <div><h2 className="text-lg font-bold text-ink mb-2">Cookies</h2><p>We use localStorage to store your authentication token. No tracking cookies.</p></div>
        <div><h2 className="text-lg font-bold text-ink mb-2">Contact</h2><p>Privacy questions? Email <a href="mailto:pava@askfred.app" className="text-clay hover:underline">pava@askfred.app</a></p></div>
      </div>
    </div>
  )
}

export default App
