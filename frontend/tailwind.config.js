/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tiktok: {
          black: '#000000',
          white: '#ffffff',
          red: '#FE2C55',
          cyan: '#25F4EE',
        },
        surface: {
          DEFAULT: '#161823',
          hover: 'rgba(255, 255, 255, 0.04)',
        },
        divider: '#2F2F2F',
        success: '#00F076',
      },
      spacing: {
        'safe-top': 'var(--safe-area-top)',
        'safe-bottom': 'var(--safe-area-bottom)',
        'nav-height': '60px',
      },
      fontFamily: {
        proxima: ['Proxima Nova', 'Inter', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      keyframes: {
        noteFloat: {
          '0%': { transform: 'translate(0, 0) scale(0.8)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translate(-20px, -40px) scale(1.2) rotate(-20deg)', opacity: '0' },
        },
        heartBeat: {
          '0%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.1)' },
          '50%': { transform: 'scale(1)' },
          '75%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0', visibility: 'hidden' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        zoomIn: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        }
      },
      animation: {
        'note-float': 'noteFloat 3s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'heart-beat': 'heartBeat 0.8s ease-in-out forwards',
        'splash-fade': 'fadeOut 0.5s ease-in-out 1.8s forwards',
        'zoom-in': 'zoomIn 0.8s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.3s ease-in forwards',
      }
    },
  },
  plugins: [],
}
