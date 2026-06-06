/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mantis palette — remapped from dark to warm gray
        bg:         '#D8D8D8',
        surface:    '#E4E4E4',
        border:     '#B0B0B0',
        accent:     '#4DE069',
        'accent-dim': '#3AB552',
        muted:      '#555550',
        text:       '#0A0A0A',
        'text-dim': '#777770',
        success:    '#22c55e',
        warning:    '#d97706',
        error:      '#dc2626',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        sans:    ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono:    ['"Space Mono"', 'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.5s ease forwards',
        'slide-up':   'slideUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'spin-slow':  'spin 3s linear infinite',
        'dash-draw':  'dashDraw 1.5s ease forwards',
      },
      keyframes: {
        fadeIn:   { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:  { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        glowPulse:{ '0%, 100%': { boxShadow: '0 0 20px rgba(77,224,105,0.15)' }, '50%': { boxShadow: '0 0 40px rgba(77,224,105,0.4)' } },
        dashDraw: { '0%': { strokeDashoffset: '500' }, '100%': { strokeDashoffset: '0' } },
      },
    },
  },
  plugins: [],
}
