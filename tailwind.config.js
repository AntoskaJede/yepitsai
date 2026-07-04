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
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
}
