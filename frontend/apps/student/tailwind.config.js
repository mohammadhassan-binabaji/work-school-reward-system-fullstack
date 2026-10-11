/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    '../../packages/shared/src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B0E14',
          card: '#131822',
          surface: '#161C28',
          border: '#1F2937',
        },
        neon: {
          green: '#64DD17',
          'green-light': '#76FF03',
          red: '#FF3D00',
          'red-light': '#FF5252',
          cyan: '#00E5FF',
          'cyan-light': '#38BDF8',
          gold: '#FFD600',
        },
      },
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'neon-green': '0 0 15px rgba(100, 221, 23, 0.4)',
        'neon-red': '0 0 15px rgba(255, 61, 0, 0.4)',
        'neon-cyan': '0 0 15px rgba(0, 229, 255, 0.4)',
        'neon-gold': '0 0 15px rgba(255, 214, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
