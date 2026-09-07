/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base dark palette
        navy: {
          950: '#020818',
          900: '#040d1f',
          800: '#071428',
          700: '#0a1d38',
          600: '#0e2847',
          500: '#133356',
        },
        // Cyan accent
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        // Severity colors
        critical: {
          DEFAULT: '#ef4444',
          light: '#fca5a5',
          dark: '#991b1b',
          bg: 'rgba(239,68,68,0.1)',
        },
        high: {
          DEFAULT: '#f97316',
          light: '#fed7aa',
          dark: '#9a3412',
          bg: 'rgba(249,115,22,0.1)',
        },
        medium: {
          DEFAULT: '#eab308',
          light: '#fef08a',
          dark: '#854d0e',
          bg: 'rgba(234,179,8,0.1)',
        },
        low: {
          DEFAULT: '#22c55e',
          light: '#bbf7d0',
          dark: '#14532d',
          bg: 'rgba(34,197,94,0.1)',
        },
        info: {
          DEFAULT: '#3b82f6',
          light: '#bfdbfe',
          dark: '#1e3a8a',
          bg: 'rgba(59,130,246,0.1)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(34, 211, 238, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(34, 211, 238, 0.6)' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)',
        'glow-cyan': '0 0 20px rgba(34, 211, 238, 0.3)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.3)',
      },
    },
  },
  plugins: [],
}
