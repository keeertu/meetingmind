/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'border': 'var(--border)',
        'border-bright': 'var(--border-bright)',
        'accent': 'var(--accent)',
        'accent-glow': 'var(--accent-glow)',
        'accent-subtle': 'var(--accent-subtle)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'high': 'var(--high)',
        'high-glow': 'var(--high-glow)',
        'medium': 'var(--medium)',
        'medium-glow': 'var(--medium-glow)',
        'low': 'var(--low)',
        'low-glow': 'var(--low-glow)',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        heading: ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.2s ease-out forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px var(--high-glow)' },
          '50%': { boxShadow: '0 0 20px rgba(255, 77, 106, 0.4)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(-6px)' },
          '50%': { transform: 'translateY(6px)' },
        }
      }
    },
  },
  plugins: [],
}
