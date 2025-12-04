/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme'
import forms from '@tailwindcss/forms'

const brandPalette = {
  ivory: '#FFF9F1',
  linen: '#F8F1E7',
  sand: '#F0E2D1',
  beige: '#E6D6C4',
  amber: '#C9843B',
  amberSoft: '#E5AF74',
  amberDeep: '#A86424',
  sage: '#7AA085',
  jade: '#4E7B61',
  bark: '#2C1A15',
  charcoal: '#3A2B24',
  dusk: '#6F5B4B',
  cloud: '#B9A89A',
}

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        brand: brandPalette,
        surface: {
          base: '#FBF7F1',
          raised: '#FFFFFF',
          tint: '#F4EBE0',
          dark: '#1F1813',
        },
        outline: {
          subtle: 'rgba(58, 43, 36, 0.12)',
          strong: 'rgba(42, 26, 21, 0.3)',
        },
      },
      boxShadow: {
        glow: '0 20px 60px rgba(194, 132, 59, 0.25)',
        hero: '0 25px 65px rgba(130, 86, 52, 0.18)',
        panel: '0 18px 70px rgba(23, 15, 10, 0.15)',
        soft: '0 10px 30px rgba(56, 33, 17, 0.12)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.6)',
      },
      borderRadius: {
        fluid: '1.5rem',
        pill: '999px',
      },
      backgroundImage: {
        linen: 'linear-gradient(180deg, #FEFCF7 0%, #F3E6D8 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulseDots: {
          '0%, 80%, 100%': { opacity: 0.2 },
          '40%': { opacity: 1 },
        },
        typewriter: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      animation: {
        'fade-up': 'fade-up 400ms cubic-bezier(0.22, 1, 0.36, 1)',
        'pulse-dots': 'pulseDots 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [forms],
}
