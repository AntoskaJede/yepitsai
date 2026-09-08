// Tiny first-party analytics beacon. Captures UTM params from the landing
// URL, then posts pageview / view events to /api/track. The server owns the
// visitor cookie and first-touch attribution; this file never reads cookies.
// Everything is wrapped so analytics can never break the app.
const API = ''
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
let utm = {}

export function initTracking() {
  try {
    const params = new URLSearchParams(window.location.search)
    const found = {}
    for (const k of UTM_KEYS) if (params.get(k)) found[k] = params.get(k).slice(0, 100)
    if (Object.keys(found).length) {
      utm = found
      sessionStorage.setItem('yi_utm', JSON.stringify(found))
    } else {
      const saved = sessionStorage.getItem('yi_utm')
      if (saved) utm = JSON.parse(saved)
    }
  } catch { utm = {} }
  track('pageview')
}

export function track(type, extra) {
  try {
    const body = JSON.stringify({
      type,
      path: window.location.pathname,
      referrer: document.referrer || null,
      utm,
      extra,
    })
    fetch(`${API}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {})
  } catch {}
}
