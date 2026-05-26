import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#EFEEEA',
        paper: '#FFFFFF',
        warmpaper: '#FBFAF6',
        ink: {
          950: '#0A0A0C',
          900: '#1A1A1C',
          800: '#26262A',
          700: '#3A3A3E',
          600: '#54545A',
          500: '#6B6B70',
          400: '#8A8A90',
          300: '#B5B5B9',
          200: '#D8D7D2',
          150: '#E0DFDA',
          100: '#EDECE8',
          50: '#F4F3EF',
        },
        brand: {
          50: '#FFF1E5',
          100: '#FFE0C7',
          400: '#FF8A3A',
          500: '#EF6A1A',
          600: '#D55514',
          700: '#9E2A12',
          800: '#7A1F0E',
          900: '#5C160A',
        },
        accent: {
          green: '#22C55E',
          red: '#E11D48',
          blue: '#3E8CC4',
          lavender: '#9F92C7',
        },
        easy: '#15803D',
        moderate: '#B45309',
        challenging: '#B91C1C',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,20,30,0.04), 0 6px 18px rgba(20,20,30,0.06)',
        floating: '0 8px 24px rgba(20,20,30,0.10), 0 2px 6px rgba(20,20,30,0.06)',
        topbar: '0 1px 2px rgba(20,20,30,0.04), 0 4px 16px rgba(20,20,30,0.04)',
        popover: '0 8px 30px rgba(20,20,30,0.12), 0 2px 8px rgba(20,20,30,0.05)',
      },
      fontFamily: {
        sans: ['Bricolage Grotesque', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Georgia', 'ui-serif', 'serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-down': {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.2)', opacity: '0.7' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'fade-up': 'fade-up 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        'sheet-down': 'sheet-down 260ms cubic-bezier(0.16, 1, 0.3, 1)',
        'modal-in': 'modal-in 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-dot': 'pulse-dot 2.4s ease-in-out infinite',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '14px' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '26px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['22px', { lineHeight: '30px' }],
        '3xl': ['26px', { lineHeight: '34px' }],
        '4xl': ['30px', { lineHeight: '38px' }],
        '5xl': ['36px', { lineHeight: '44px' }],
      },
    },
  },
  plugins: [],
};

export default config;
