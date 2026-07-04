/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Background colors
        bg: {
          primary: '#f9fafb',   // Main background
          card: '#ffffff',      // Card background
          overlay: '#f3f4f6',   // Overlay/hover
        },
        // Text colors
        text: {
          primary: '#1e293b',   // Main text
          secondary: '#64748b', // Secondary text
          muted: '#94a3b8',     // Muted text
        },
        // Border colors
        border: {
          default: '#e2e8f0',   // Normal border
          dark: '#cbd5e1',      // Darker border
        },
        // Semantic colors
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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        safe: '1rem',
      },
    },
  },
  plugins: [],
};
