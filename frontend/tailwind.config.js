/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2D9A27',
          dark:    '#228020',
          light:   '#E8F5E8',
        },
        sidebar: '#1a1a2e',
      },
    },
  },
  plugins: [],
}
