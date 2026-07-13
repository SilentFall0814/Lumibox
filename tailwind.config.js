/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 白色极简主题
        background: '#ffffff',
        muted: '#f9fafb',
        border: '#e5e7eb',
        primary: '#2563eb',
        'primary-hover': '#1d4ed8',
        'primary-bg': '#eff6ff',
        foreground: '#1f2937',
        'muted-fg': '#6b7280',
        danger: '#dc2626'
      },
      fontFamily: {
        sans: ['PingFang SC', 'sans-serif']
      }
    }
  },
  plugins: []
};
