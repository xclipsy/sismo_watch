/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fintech: {
          dark: '#0F172A',
          charcoal: '#1E293B',
          muted: '#64748B',
          border: '#E2E8F0',
          bg: '#F8FAFC',
          mint: '#2FD5C6',
          teal: '#10B981',
          lightmint: '#E0F7F4',
          accent: '#06B6D4'
        }
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem'
      },
      boxShadow: {
        'fintech': '0 10px 30px -5px rgba(15, 23, 42, 0.05), 0 4px 6px -2px rgba(15, 23, 42, 0.02)',
        'fintech-lg': '0 20px 40px -10px rgba(15, 23, 42, 0.08), 0 8px 10px -4px rgba(15, 23, 42, 0.03)'
      }
    },
  },
  plugins: [],
}
