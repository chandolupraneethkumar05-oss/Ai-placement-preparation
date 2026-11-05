/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vfstr: {
          navy: '#0f172a',
          blue: '#1e3a8a',
          accent: '#2563eb',
          gold: '#f59e0b',
          crimson: '#991b1b'
        }
      }
    },
  },
  plugins: [],
}
