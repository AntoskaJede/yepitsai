import { useState, useEffect, useCallback } from 'react'

const API = ''

function App() {
  const [token, setToken] = useState(localStorage.getItem('yepits_token') || '')
  const [user, setUser] = useState(null)
  const [view, setView] = useState('landing') // landing, result, tooLong, auth, terms, privacy
  const [summaryData, setSummaryData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authMode, setAuthMode] = useState('login')

  // Check URL path on mount
  useEffect(() => {
    const path = window.location.pathname
    if (path === '/terms') setView('terms')
    else if (path === '/privacy') setView('privacy')
  }, [])

  // Load user on mount if token exists
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

      const res = await fetch(`${API}/api/summarize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url })
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.needsAuth) {
          setAuthMode('signup')
          setView('auth')
          setError('Sign in to continue summarizing.')
        } else if (data.tooLong) {
          setView('tooLong')
          setSummaryData({ duration: data.duration })
        } else {
          setError(data.error || 'Something went wrong. Try again.')
        }
      } else {
        setSummaryData(data)
        setView('result')
      }
    } catch {
      setError('Network error. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (email, password, acceptTerms) => {
    setError('')
    const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login'
    const body = authMode === 'signup'
      ? { email, password, acceptTerms }
      : { email, password }

    const res = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Authentication failed.')
      return false
    }

    localStorage.setItem('yepits_token', data.token)
    setToken(data.token)
    setUser(data.user)
    setView('landing')
    return true
  }

  const handleLogout = () => {
    localStorage.removeItem('yepits_token')
    setToken('')
    setUser(null)
    setView('landing')
  }

  const handleUpgrade = async () => {
    if (!token) {
      setAuthMode('signup')
      setView('auth')
      return
    }
    try {
      const res = await fetch(`${API}/api/create-checkout-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setError('Could not start checkout. Try again.')
    }
  }

  return (
    <div className="min-h-screen">
      <Header user={user} onLogin={() => { setAuthMode('login'); setView('auth') }} onSignup={() => { setAuthMode('signup'); setView('auth') }} onLogout={handleLogout} onUpgrade={handleUpgrade} />

      {view === 'landing' && (
        <Landing onSummarize={handleSummarize} loading={loading} error={error} user={user} />
      )}

      {view === 'result' && summaryData && (
        <SummaryView data={summaryData} onReset={() => setView('landing')} />
      )}

      {view === 'tooLong' && (
        <TooLongView duration={summaryData?.duration} onUpgrade={handleUpgrade} onReset={() => setView('landing')} user={user} />
      )}

      {view === 'auth' && (
        <AuthView mode={authMode} setMode={setAuthMode} onAuth={handleAuth} error={error} onClose={() => { setView('landing'); setError('') }} />
      )}

      {view === 'landing' && <PricingSection onUpgrade={handleUpgrade} />}
      {view === 'landing' && <FAQSection />}
      {(view === 'terms' || view === 'privacy') && (
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <button onClick={() => setView('landing')} className="text-sm text-slate-400 hover:text-indigo-500 transition-colors">← Back to YepIts.ai</button>
        </div>
      )}

      {view === 'terms' && <TermsView />}
      {view === 'privacy' && <PrivacyView />}
      <Footer onNavigate={setView} />
    </div>
  )
}

// ─── Header ───────────────────────────────────────────
function Header({ user, onLogin, onSignup, onLogout, onUpgrade }) {
  return (
    <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">Y</span>
          </div>
          <span className="font-bold text-slate-800">YepIts.ai</span>
        </a>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-slate-500 hidden sm:inline">{user.email}</span>
              {user.plan === 'pro' ? (
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">PRO</span>
              ) : (
                <button onClick={onUpgrade} className="text-sm font-semibold text-indigo-500 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all">Upgrade to Pro →</button>
              )}
              <button onClick={onLogout} className="text-sm text-slate-500 hover:text-slate-800 transition-colors">Sign out</button>
            </>
          ) : (
            <>
              <button onClick={onLogin} className="text-sm text-slate-600 hover:text-indigo-500 transition-colors">Sign in</button>
              <button onClick={onSignup} className="btn-primary text-sm">Sign up</button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

// ─── Landing / Hero ────────────────────────────────────
function Landing({ onSummarize, loading, error, user }) {
  const [url, setUrl] = useState('')
  const [dailyLeft, setDailyLeft] = useState(null)

  useEffect(() => {
    // Fetch usage info
    const token = localStorage.getItem('yepits_token')
    if (token) {
      fetch(`${API}/api/usage`, { headers: { Authorization: `Bearer ${token}` }})
        .then(r => r.json()).then(d => setDailyLeft(d.remaining)).catch(() => {})
    }
  }, [])

  const submit = (e) => {
    e.preventDefault()
    if (!url.trim()) return
    onSummarize(url.trim())
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-16 pb-12 text-center">
      {/* Hero headline — FIX #1 */}
      <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-800 mb-4 leading-[1.05]">
        Turn any video into a <span className="text-indigo-500">2-minute read</span>
      </h1>
      <p className="text-lg text-slate-500 mb-10 leading-relaxed">
        Paste any YouTube link and get an instant AI summary with key takeaways and timestamps.
      </p>

      {/* Input */}
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Paste YouTube URL..."
          className="input flex-1 text-base"
          autoFocus
        />
        <button type="submit" disabled={loading || !url.trim()} className="btn-primary whitespace-nowrap">
          {loading ? 'Summarizing...' : 'Summarize'}
        </button>
      </form>

      {/* Free badge */}
      <div className="mt-4 flex items-center justify-center gap-3 text-sm text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Free to try — 3 summaries per day
        </span>
        {dailyLeft !== null && (
          <span className="text-slate-400">{dailyLeft} free summaries left today</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mt-12">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-[3px] border-indigo-50" />
              <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-indigo-500 animate-spin" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-1">Summarizing...</h2>
          <p className="text-sm text-slate-400">Reading the transcript and extracting key points.</p>
        </div>
      )}

      {/* How it works */}
      {!loading && (
        <div className="mt-20 mb-10">
          <h2 className="text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-8">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <Step num="1" title="Paste a link" desc="Any YouTube video URL — lectures, podcasts, tutorials, interviews." />
            <Step num="2" title="AI reads it" desc="Claude analyzes the transcript and extracts the key points instantly." />
            <Step num="3" title="Get the summary" desc="Clean summary with key takeaways and clickable timestamps." />
          </div>
        </div>
      )}
    </div>
  )
}

function Step({ num, title, desc }) {
  return (
    <div className="text-center sm:text-left">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 font-bold flex items-center justify-center mb-3 mx-auto sm:mx-0">{num}</div>
      <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  )
}

// ─── Summary Result View ──────────────────────────────
function SummaryView({ data, onReset }) {
  const { title, summary, keyTakeaways, keyMoments, videoId, remaining, exportFormat } = data
  const [showExport, setShowExport] = useState(false)

  const handleExport = (format) => {
    let content = `# ${title}\n\n## Summary\n${summary}\n`
    if (keyTakeaways?.length) {
      content += `\n## Key Takeaways\n${keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
    }
    if (keyMoments?.length) {
      content += `\n## Key Moments\n${keyMoments.map(m => `[${m.time}] ${m.label}`).join('\n')}\n`
    }
    const blob = new Blob([content], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `summary-${videoId || 'video'}.${format === 'md' ? 'md' : 'txt'}`
    a.click()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {title && <h1 className="text-xl font-bold text-slate-800 mb-6">{title}</h1>}

      {summary && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-3">Summary</h2>
          <p className="text-slate-600 leading-relaxed whitespace-pre-line">{summary}</p>
        </div>
      )}

      {keyTakeaways?.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-3">Key Takeaways</h2>
          <ul className="space-y-2">
            {keyTakeaways.map((t, i) => (
              <li key={i} className="flex gap-3 text-slate-600 leading-relaxed">
                <span className="text-indigo-500 font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {keyMoments?.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-3">Key Moments</h2>
          <div className="space-y-2">
            {keyMoments.map((m, i) => (
              <a key={i} href={`https://www.youtube.com/watch?v=${videoId}&t=${m.seconds}s`} target="_blank" rel="noopener noreferrer"
                className="flex gap-3 items-start p-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors group">
                <span className="text-sm font-mono font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded flex-shrink-0">{m.time}</span>
                <span className="text-sm text-slate-600 group-hover:text-slate-800">{m.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Usage warning */}
      {remaining !== undefined && remaining <= 1 && (
        <div className="card-light mb-6 text-center">
          <p className="text-sm text-slate-500">
            {remaining === 0 ? "You've used all your free summaries for today. " : "This was your last free summary for today. "}
            <span className="text-indigo-500 font-medium cursor-pointer" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>Upgrade to Pro</span>
            {' '}for unlimited summaries and longer videos.
          </p>
        </div>
      )}

      <p className="text-center text-xs text-slate-400 mb-6">Summarized with YepIts.ai</p>

      {/* Export (Pro feature) */}
      {showExport && (
        <div className="flex gap-2 justify-center mb-4">
          <button onClick={() => handleExport('txt')} className="btn-secondary text-sm">Export .txt</button>
          <button onClick={() => handleExport('md')} className="btn-secondary text-sm">Export .md</button>
        </div>
      )}

      <div className="text-center">
        <button onClick={onReset} className="btn-secondary">Summarize another video</button>
      </div>
    </div>
  )
}

// ─── Too Long View — FIX #2: No waitlist, direct upgrade ───
function TooLongView({ duration, onUpgrade, onReset, user }) {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-3">This video is {duration} minutes long</h2>
        <p className="text-slate-500 mb-6 leading-relaxed">
          Free summaries cover videos up to 15 minutes. Upgrade to Pro for unlimited video length and summaries.
        </p>
        <button onClick={onUpgrade} className="btn-primary w-full mb-4">Upgrade to Pro — $7/month</button>
        <div className="bg-slate-50 rounded-lg p-4 text-left">
          <p className="font-semibold text-slate-800 mb-1">Pro includes:</p>
          <ul className="text-sm text-slate-500 space-y-1">
            <li>• Unlimited video length</li>
            <li>• Unlimited summaries</li>
            <li>• Export to text and Markdown</li>
            <li>• No branding</li>
          </ul>
        </div>
      </div>
      <button onClick={onReset} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">Try a shorter video</button>
    </div>
  )
}

// ─── Auth View ─────────────────────────────────────────
function AuthView({ mode, setMode, onAuth, error, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(true)
  const [localError, setLocalError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLocalError('')
    if (mode === 'signup' && !acceptTerms) {
      setLocalError('Please accept the Terms and Privacy Policy to continue.')
      return
    }
    await onAuth(email.toLowerCase().trim(), password, acceptTerms)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">{mode === 'signup' ? 'Sign up' : 'Sign in'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={submit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" required minLength="8" />
          </div>
          {mode === 'signup' && (
            <label className="flex items-start gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-1 w-4 h-4 rounded text-indigo-500 focus:ring-indigo-500" />
              <span className="text-sm text-slate-500">I agree to the <a href="/terms" target="_blank" rel="noopener" className="text-indigo-500 hover:underline">Terms</a> and <a href="/privacy" target="_blank" rel="noopener" className="text-indigo-500 hover:underline">Privacy Policy</a></span>
            </label>
          )}
          {(error || localError) && (
            <div className="mb-4 text-sm text-red-500 bg-red-50 rounded-lg p-3">{error || localError}</div>
          )}
          <button type="submit" className="btn-primary w-full">{mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        </form>

        <div className="text-center mt-6 text-sm text-slate-400">
          {mode === 'signup' ? (
            <>Already have an account? <button onClick={() => setMode('login')} className="text-indigo-500 hover:underline font-medium">Sign in</button></>
          ) : (
            <>New here? <button onClick={() => setMode('signup')} className="text-indigo-500 hover:underline font-medium">Sign up</button></>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Pricing Section ───────────────────────────────────
function PricingSection({ onUpgrade }) {
  return (
    <section className="max-w-4xl mx-auto px-4 py-16">
      <h2 className="text-2xl font-bold text-slate-800 text-center mb-12">Pricing</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold text-slate-800 mb-1">Free</h3>
          <p className="text-3xl font-black text-slate-800 mb-4">$0</p>
          <ul className="space-y-2 text-sm text-slate-500">
            <li>3 summaries per day</li>
            <li>Videos up to 15 minutes</li>
            <li>Key takeaways & timestamps</li>
            <li>YepIts.ai branding</li>
          </ul>
        </div>
        <div className="card relative border-indigo-200 ring-1 ring-indigo-100">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-semibold px-3 py-0.5 rounded">PRO</div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Pro</h3>
          <p className="text-3xl font-black text-slate-800 mb-4">$7<span className="text-base font-normal text-slate-400">/mo</span></p>
          <ul className="space-y-2 text-sm text-slate-500 mb-6">
            <li>Unlimited summaries</li>
            <li>Any video length</li>
            <li>Export to text and Markdown</li>
            <li>No branding</li>
            <li>Priority processing</li>
          </ul>
          <button onClick={onUpgrade} className="btn-primary w-full">Upgrade to Pro</button>
        </div>
      </div>
    </section>
  )
}

// ─── FAQ — FIX #3: Add pricing question ────────────────
function FAQSection() {
  const faqs = [
    { q: 'How much does it cost?', a: 'Free: 3 summaries per day for videos up to 15 minutes. Pro: $7/month for unlimited summaries, any video length, export options, and no branding.' },
    { q: 'How accurate are the summaries?', a: 'Very. We use Claude (by Anthropic) to analyze the full transcript and extract the most important points. It works best on talking-head videos, lectures, and podcasts where there\'s clear speech.' },
    { q: 'What languages are supported?', a: 'Any video that has captions or subtitles (either auto-generated or manual). Most YouTube videos qualify. The summary is generated in English regardless of the video language.' },
    { q: 'Can I export my summaries?', a: 'Yes — Pro users can export to plain text or Markdown format with one click.' },
    { q: 'Does it work on podcasts?', a: 'Absolutely. Podcasts are actually one of the best use cases — get the key points of a 2-hour episode in seconds.' }
  ]
  const [open, setOpen] = useState(null)

  return (
    <section className="max-w-2xl mx-auto px-4 py-16">
      <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">FAQ</h2>
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <div key={i} className="card cursor-pointer" onClick={() => setOpen(open === i ? null : i)}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">{f.q}</h3>
              <span className="text-slate-400">{open === i ? '−' : '+'}</span>
            </div>
            {open === i && <p className="mt-3 text-sm text-slate-500 leading-relaxed">{f.a}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Footer ────────────────────────────────────────────
function Footer({ onNavigate }) {
  return (
    <footer className="border-t border-slate-100 mt-12">
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <span>© 2026 YepIts.ai</span>
        <div className="flex gap-4">
          <button onClick={() => onNavigate('terms')} className="hover:text-slate-600 transition-colors">Terms of Service</button>
          <button onClick={() => onNavigate('privacy')} className="hover:text-slate-600 transition-colors">Privacy Policy</button>
        </div>
      </div>
    </footer>
  )
}

// ─── Terms of Service ─────────────────────────────────
function TermsView() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Terms of Service</h1>
      <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
        <p className="text-sm text-slate-400">Last updated: June 19, 2026</p>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Acceptance of Terms</h2>
          <p>By using YepIts.ai, you agree to these terms. If you don't agree, don't use the service.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">2. Service Description</h2>
          <p>YepIts.ai provides AI-generated summaries of YouTube videos. Summaries are generated by AI and may not be perfectly accurate. Use your own judgment.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">3. Free and Pro Plans</h2>
          <p>Free accounts get 3 summaries per day for videos up to 15 minutes. Pro accounts ($7/month) get unlimited summaries and features. You can cancel Pro anytime.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">4. Acceptable Use</h2>
          <p>Don't abuse the service, create multiple accounts to bypass limits, scrape data, or use the service for anything illegal. We may suspend accounts that violate these terms.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">5. Privacy</h2>
          <p>We store your email and usage data. See our <a href="/privacy" className="text-indigo-500 hover:underline">Privacy Policy</a> for details.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">6. Limitation of Liability</h2>
          <p>YepIts.ai is provided "as is" without warranties. We're not liable for any damages arising from use of the service.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">7. Changes</h2>
          <p>We may update these terms from time to time. Continued use after changes means you accept the new terms.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">8. Contact</h2>
          <p>Questions? Email <a href="mailto:pava@askfred.app" className="text-indigo-500 hover:underline">pava@askfred.app</a></p>
        </div>
      </div>
    </div>
  )
}

// ─── Privacy Policy ───────────────────────────────────
function PrivacyView() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Privacy Policy</h1>
      <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
        <p className="text-sm text-slate-400">Last updated: June 19, 2026</p>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">What We Collect</h2>
          <p><strong>Email address</strong> — when you sign up.</p>
          <p><strong>Usage data</strong> — which videos you summarize (stored as video IDs) and how often you use the service.</p>
          <p><strong>IP address</strong> — hashed and used only for rate limiting and abuse prevention. We don't store raw IPs.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">What We Do With It</h2>
          <p>We use your email to authenticate you and notify you about your account. We use usage data to enforce plan limits and improve the service. That's it. No selling data, no third-party ad tracking.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Payments</h2>
          <p>Payment processing is handled by Stripe. We don't see or store your card details — Stripe does.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">AI Processing</h2>
          <p>Video transcripts are sent to Anthropic (Claude) for summarization. Anthropic's data retention is governed by their <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener" className="text-indigo-500 hover:underline">privacy policy</a>.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Data Retention</h2>
          <p>Your account data is kept as long as your account is active. You can request deletion by emailing us.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Cookies</h2>
          <p>We use localStorage to store your authentication token. No tracking cookies.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Contact</h2>
          <p>Privacy questions? Email <a href="mailto:pava@askfred.app" className="text-indigo-500 hover:underline">pava@askfred.app</a></p>
        </div>
      </div>
    </div>
  )
}

export default App
