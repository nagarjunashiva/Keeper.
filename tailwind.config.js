/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        keeper: {
          bg: '#101113',
          sidebar: '#151619',
          card: '#191A1E',
          border: '#292A2F',
          text: '#F5F3EF',
          muted: '#A5A5A5',
          accent: '#F2BD91'
        }
      }
    }
  },
  plugins: []
};
