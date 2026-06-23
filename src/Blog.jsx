import { useState } from 'react'
import { blogPosts, getPostBySlug, getRelatedPosts } from './blog-data'

// ─── Lightweight Markdown Renderer ────────────────────
function Markdown({ content }) {
  const blocks = parseMarkdown(content)
  return blocks.map((block, i) => {
    switch (block.type) {
      case 'h1': return <h1 key={i} className="text-2xl font-bold text-slate-800 mt-8 mb-3">{renderInline(block.text)}</h1>
      case 'h2': return <h2 key={i} className="text-xl font-bold text-slate-800 mt-8 mb-3">{renderInline(block.text)}</h2>
      case 'h3': return <h3 key={i} className="text-lg font-semibold text-slate-800 mt-6 mb-2">{renderInline(block.text)}</h3>
      case 'p': return <p key={i} className="text-slate-600 leading-relaxed mb-4">{renderInline(block.text)}</p>
      case 'ul': return (
        <ul key={i} className="space-y-1.5 mb-4 ml-1">
          {block.items.map((item, j) => (
            <li key={j} className="flex gap-2.5 text-slate-600 leading-relaxed">
              <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      case 'ol': return (
        <ol key={i} className="space-y-1.5 mb-4 ml-1">
          {block.items.map((item, j) => (
            <li key={j} className="flex gap-2.5 text-slate-600 leading-relaxed">
              <span className="text-indigo-500 font-semibold mt-0.5 flex-shrink-0">{j + 1}.</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      )
      case 'table': return (
        <div key={i} className="overflow-x-auto mb-4 -mx-1">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                {block.headers.map((h, j) => (
                  <th key={j} className="text-left font-semibold text-slate-700 px-3 py-2 whitespace-nowrap">{renderInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, j) => (
                <tr key={j} className="border-b border-slate-100">
                  {row.map((cell, k) => (
                    <td key={k} className="px-3 py-2 text-slate-600">{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      case 'hr': return <hr key={i} className="border-slate-100 my-6" />
      case 'blockquote': return (
        <blockquote key={i} className="border-l-3 border-indigo-300 pl-4 italic text-slate-500 mb-4">{renderInline(block.text)}</blockquote>
      )
      case 'strong-p': return <p key={i} className="text-slate-700 leading-relaxed mb-4 font-medium">{renderInline(block.text)}</p>
      default: return null
    }
  })
}

function parseMarkdown(text) {
  const lines = text.split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip empty lines
    if (line.trim() === '') { i++; continue }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) { blocks.push({ type: 'hr' }); i++; continue }

    // Headings
    if (line.startsWith('### ')) { blocks.push({ type: 'h3', text: line.slice(4) }); i++; continue }
    if (line.startsWith('## ')) { blocks.push({ type: 'h2', text: line.slice(3) }); i++; continue }
    if (line.startsWith('# ')) { blocks.push({ type: 'h1', text: line.slice(2) }); i++; continue }

    // Table detection
    if (line.includes('|') && i + 1 < lines.length && /^\|?[\s-:]+\|/.test(lines[i + 1])) {
      const headers = line.split('|').map(c => c.trim()).filter(c => c !== '')
      i += 2 // skip header separator
      const rows = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        const cells = lines[i].split('|').map(c => c.trim()).filter(c => c !== '')
        // Handle edge case where leading/trailing pipes were stripped
        if (cells.length === headers.length || cells.length === headers.length - 1) {
          rows.push(cells)
        } else {
          rows.push(cells)
        }
        i++
      }
      blocks.push({ type: 'table', headers, rows })
      continue
    }

    // Unordered list
    if (/^[-*]\s/.test(line.trim())) {
      const items = []
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line.trim())) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    // Paragraph starting with **bold** — treat whole para as strong-p for emphasis
    if (line.trim().startsWith('**') && line.trim().endsWith('**') && !line.includes('[[')) {
      // Single bold line — treat as paragraph
      blocks.push({ type: 'p', text: line.trim() })
      i++
      continue
    }

    // Regular paragraph (collect consecutive non-empty, non-special lines)
    const paraLines = []
    while (i < lines.length && lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !/^---+$/.test(lines[i].trim()) &&
      !/^[-*]\s/.test(lines[i].trim()) &&
      !/^\d+\.\s/.test(lines[i].trim()) &&
      !(lines[i].includes('|') && i + 1 < lines.length && /^\|?[\s-:]+\|/.test(lines[i + 1]))) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'p', text: paraLines.join(' ') })
    }
  }

  return blocks
}

function renderInline(text) {
  // Handle **bold**, [link](url), and `code`
  const parts = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    // Link
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/)

    // Find which match comes first
    const matches = [
      boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index } : null,
      linkMatch ? { type: 'link', match: linkMatch, index: linkMatch.index } : null,
      codeMatch ? { type: 'code', match: codeMatch, index: codeMatch.index } : null,
    ].filter(Boolean).sort((a, b) => a.index - b.index)

    if (matches.length === 0) {
      parts.push(remaining)
      break
    }

    const first = matches[0]

    // Push text before the match
    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index))
    }

    if (first.type === 'bold') {
      parts.push(<strong key={key++} className="font-semibold text-slate-800">{first.match[1]}</strong>)
    } else if (first.type === 'link') {
      parts.push(<a key={key++} href={first.match[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">{first.match[1]}</a>)
    } else if (first.type === 'code') {
      parts.push(<code key={key++} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-sm font-mono">{first.match[1]}</code>)
    }

    remaining = remaining.slice(first.index + first.match[0].length)
  }

  return parts
}

// ─── Blog List View ───────────────────────────────────
export function BlogList({ onNavigate }) {
  const [category, setCategory] = useState('All')

  const categories = ['All', ...new Set(blogPosts.map(p => p.category))]
  const filtered = category === 'All' ? blogPosts : blogPosts.filter(p => p.category === category)

  return (
    <div className="max-w-3xl mx-auto px-4 pt-12 pb-16">
      {/* Header */}
      <div className="mb-10 text-center">
        <p className="text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-2">YepIts.ai Blog</p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-800 mb-3">
          Thoughts on video, learning, and saving time
        </h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          Guides, comparisons, and ideas about making the most of video content without wasting hours.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-all ${
              category === cat
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {filtered.map(post => (
          <article
            key={post.slug}
            onClick={() => onNavigate(post.slug)}
            className="card cursor-pointer hover:shadow-md hover:border-indigo-100 transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{post.category}</span>
              <span className="text-xs text-slate-400">{post.date}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-500 transition-colors">
              {post.title}
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">{post.excerpt}</p>
            <span className="inline-block mt-3 text-sm font-semibold text-indigo-500 group-hover:text-indigo-600">
              Read more →
            </span>
          </article>
        ))}
      </div>
    </div>
  )
}

// ─── Blog Post View ───────────────────────────────────
export function BlogPost({ slug, onNavigate }) {
  const post = getPostBySlug(slug)

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Post not found</h1>
        <button onClick={() => onNavigate('blog')} className="text-indigo-500 hover:underline font-medium">
          ← Back to blog
        </button>
      </div>
    )
  }

  const related = getRelatedPosts(slug, 3)

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-16">
      {/* Back link */}
      <button
        onClick={() => onNavigate('blog')}
        className="text-sm text-slate-400 hover:text-indigo-500 transition-colors mb-6"
      >
        ← Back to blog
      </button>

      {/* Article header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{post.category}</span>
          <span className="text-xs text-slate-400">{post.date}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800 leading-tight mb-4">
          {post.title}
        </h1>
        <p className="text-lg text-slate-500 leading-relaxed">{post.excerpt}</p>
      </div>

      {/* Article body */}
      <article className="blog-content">
        <Markdown content={post.content} />
      </article>

      {/* CTA */}
      <div className="mt-12 mb-10 p-6 bg-indigo-50 rounded-2xl text-center">
        <h3 className="text-lg font-bold text-slate-800 mb-2">Try it free — no sign-up needed</h3>
        <p className="text-sm text-slate-500 mb-4">Paste any YouTube link and get an instant AI summary with key takeaways and timestamps.</p>
        <a
          href="/"
          className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg px-6 py-2.5 transition-all"
        >
          Summarize a video →
        </a>
      </div>

      {/* Related posts */}
      {related.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-4">More articles</h3>
          <div className="space-y-3">
            {related.map(r => (
              <div
                key={r.slug}
                onClick={() => onNavigate(r.slug)}
                className="card cursor-pointer hover:shadow-md hover:border-indigo-100 transition-all group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{r.category}</span>
                  <span className="text-xs text-slate-400">{r.date}</span>
                </div>
                <h4 className="font-bold text-slate-800 group-hover:text-indigo-500 transition-colors">{r.title}</h4>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{r.excerpt}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Blog
