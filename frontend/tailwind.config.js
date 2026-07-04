/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        cream: { DEFAULT: '#FAF6F0', 100: '#FAF6F0', 200: '#F5EFE6', 300: '#F0EBE3' },
        clay: { DEFAULT: '#FF4F00', light: '#FF8C42', soft: '#FFE8DD' },
        ink: { DEFAULT: '#1a1a1a', light: '#262626', muted: '#666', faint: '#999' },
        moss: { DEFAULT: '#00C853', soft: '#E6F9F0' },
        // Keep existing color system for compatibility
        mist: {
          DEFAULT: '#f9fafb',
          card: '#ffffff',
          dim: '#f3f4f6',
        },
        slate: {
          text: '#1e293b',
          muted: '#64748b',
          dim: '#94a3b8',
          border: '#e2e8f0',
          'border-dark': '#cbd5e1',
        },
        indigo: {
          50: 'rgba(99,102,241,0.06)',
          100: 'rgba(99,102,241,0.12)',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
      }
    }
  },
  plugins: []
}
