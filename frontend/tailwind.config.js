/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        secondary: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
          950: '#4a044e',
        },
        skillbox: {
          purple: '#667eea',
          violet: '#764ba2',
          green: '#10b981',
          darkgreen: '#059669',
          blue: '#3b82f6',
          darkblue: '#2563eb',
          narrativePurple: '#8b5cf6',
          narrativeDark: '#7c3aed',
        }
      },
      backgroundImage: {
        'gradient-skillbox': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-narrative': 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        'gradient-csrd': 'linear-gradient(135deg, #10b981, #059669)',
        'gradient-adoption': 'linear-gradient(135deg, #3b82f6, #2563eb)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      boxShadow: {
        'glass': '0 10px 30px rgba(0,0,0,0.2)',
        'glass-hover': '0 20px 40px rgba(0,0,0,0.3)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
  ],
} 