/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff4ff',
          100: '#dbe8fe',
          200: '#bfd4fd',
          300: '#93b4fb',
          400: '#6090f7',
          500: '#3b6ef1',
          600: '#254fe6',
          700: '#1d3cd3',
          800: '#1B3A6B',
          900: '#1a2f5e',
          950: '#141f3d',
        },
        navy: '#1B3A6B',
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        amber: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
