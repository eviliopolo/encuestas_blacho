/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#366092',
        secondary: '#0066CC',
        success: '#10B981',
        error: '#EF4444',
        background: '#F9FAFB',
        foreground: '#1F2937',
        card: '#ffffff',
        popover: '#ffffff',
        muted: '#f3f4f6',
        'muted-foreground': '#6b7280',
        accent: '#e5e7eb',
        'accent-foreground': '#1F2937',
        destructive: '#EF4444',
        border: '#e5e7eb',
        input: '#e5e7eb',
        ring: '#366092',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
