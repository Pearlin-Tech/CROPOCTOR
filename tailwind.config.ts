import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Agricultural palette
        'green-forest':  '#2E7D32',
        'green-soft':    '#66B86A',
        'green-pastel':  '#A8D5A2',
        'green-light':   '#E8F5E9',
        'brown-earth':   '#8D6245',
        'brown-soft':    '#B8947A',
        'beige-warm':    '#F5EBDD',
        'cream':         '#FFF9F0',
        'off-white':     '#FAFBF8',
        'muted-warning': '#D8A84E',
        'muted-danger':  '#C96C62',
        // Semantic aliases
        primary:   '#2E7D32',
        secondary: '#8D6245',
        surface:   '#FFF9F0',
        background:'#FAFBF8',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs':   ['12px', { lineHeight: '1.5' }],
        'sm':   ['14px', { lineHeight: '1.5' }],
        'base': ['16px', { lineHeight: '1.6' }],
        'lg':   ['18px', { lineHeight: '1.5' }],
        'xl':   ['20px', { lineHeight: '1.4' }],
        '2xl':  ['24px', { lineHeight: '1.3' }],
        '3xl':  ['28px', { lineHeight: '1.2' }],
        '4xl':  ['36px', { lineHeight: '1.1' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
      },
      borderRadius: {
        'xl':  '16px',
        '2xl': '20px',
        '3xl': '28px',
        '4xl': '36px',
      },
      boxShadow: {
        'card':   '0 2px 16px rgba(46,125,50,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        'card-lg':'0 4px 32px rgba(46,125,50,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        'button': '0 4px 14px rgba(46,125,50,0.25)',
        'nav':    '0 -2px 16px rgba(0,0,0,0.06)',
      },
      backgroundImage: {
        'gradient-farm':    'linear-gradient(135deg, #E8F5E9 0%, #FFF9F0 100%)',
        'gradient-green':   'linear-gradient(135deg, #2E7D32 0%, #66B86A 100%)',
        'gradient-earth':   'linear-gradient(135deg, #8D6245 0%, #B8947A 100%)',
        'gradient-cream':   'linear-gradient(180deg, #FFF9F0 0%, #F5EBDD 100%)',
        'gradient-hero':    'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)',
      },
      animation: {
        'shimmer':       'shimmer 1.8s infinite',
        'pulse-soft':    'pulse-soft 2s ease-in-out infinite',
        'grow-up':       'grow-up 0.4s ease-out',
        'scan-line':     'scan-line 2s linear infinite',
        'waveform':      'waveform 1.2s ease-in-out infinite',
        'spin-slow':     'spin 3s linear infinite',
        'bounce-gentle': 'bounce-gentle 1s ease-in-out infinite',
        'fade-in':       'fadeIn 0.3s ease-out',
        'slide-up':      'slideUp 0.3s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.04)' },
        },
        'grow-up': {
          '0%':   { transform: 'scaleY(0)', transformOrigin: 'bottom' },
          '100%': { transform: 'scaleY(1)', transformOrigin: 'bottom' },
        },
        'scan-line': {
          '0%':   { top: '0%' },
          '100%': { top: '100%' },
        },
        waveform: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%':      { transform: 'scaleY(1)' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      screens: {
        'xs': '320px',
        'sm': '375px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1440px',
      },
      maxWidth: {
        'mobile':  '430px',
        'tablet':  '768px',
        'content': '1280px',
      },
    },
  },
  plugins: [],
}

export default config
