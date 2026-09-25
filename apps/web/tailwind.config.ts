import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#1C1033',
          'bg-subtle': '#241440',
          'bg-muted': '#2D1A57',
          surface: '#1E1145',
          border: '#3B2068',
          'border-subtle': '#2A1750',
        },
        primary: {
          DEFAULT: '#A855F7',
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
          950: '#3B0764',
        },
        accent: {
          DEFAULT: '#22D3EE',
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },
        neutral: {
          900: '#0F0721',
          800: '#1C1033',
          700: '#241440',
          600: '#3B2068',
          500: '#6B4E9B',
          400: '#9B7ECB',
          300: '#C4B0E8',
          200: '#DDD4F4',
          100: '#F0EBFC',
          50: '#FAF8FF',
        },
        success: { DEFAULT: '#10B981', subtle: '#064E3B' },
        warning: { DEFAULT: '#F59E0B', subtle: '#451A03' },
        error: { DEFAULT: '#EF4444', subtle: '#450A0A' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(168,85,247,0.35)',
        'glow-cyan': '0 0 20px rgba(34,211,238,0.3)',
        'glow-sm': '0 0 10px rgba(168,85,247,0.25)',
        card: '0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(168,85,247,0.3)',
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite linear',
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 250ms cubic-bezier(0.16,1,0.3,1)',
        'slide-in-right': 'slideInRight 300ms cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
