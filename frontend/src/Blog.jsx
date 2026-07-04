export function BlogList({ onNavigate }) {
  return <div className="max-w-4xl mx-auto px-6 py-12"><p className="text-center text-ink-muted">Blog coming soon...</p></div>
}

export function BlogPost({ slug, onNavigate }) {
  return <div className="max-w-2xl mx-auto px-6 py-12"><button onClick={() => onNavigate('blog')} className="text-sm text-clay hover:text-clay-light">← Back to blog</button></div>
}
