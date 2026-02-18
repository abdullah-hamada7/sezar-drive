/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0B0D11', /* Darker Slate */
          secondary: '#151921',
          tertiary: '#1E2530',
          card: 'rgba(21, 25, 33, 0.8)',
          hover: '#2D3748',
          input: '#0B0D11',
        },
        primary: {
          DEFAULT: '#3B82F6', /* Refined Blue */
          light: '#60A5FA',
          dark: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          900: '#1E3A8A',
        },
        accent: {
          orange: '#FF5A1F', /* Crisp Safety Orange */
          cyan: '#06B6D4',
        },
        surface: 'rgba(21, 25, 33, 0.95)',
        text: {
          DEFAULT: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
          inverse: '#0F172A',
        },
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        border: '#1E293B',
        'border-light': '#334155',
      },
      fontFamily: {
        display: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        none: '0',
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
        full: '9999px',
      },
      spacing: {
        '4xs': '0.125rem',
        '3xs': '0.25rem',
        '2xs': '0.375rem',
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.25rem',
        xl: '1.5rem',
        '2xl': '2rem',
        '3xl': '3rem',
        '4xl': '4rem',
      },
      boxShadow: {
        soft: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        highlight: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        glow: '0 0 15px rgba(59, 130, 246, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionDuration: {
        fast: '100ms',
        base: '200ms',
      }
    },
  },
  plugins: [],
}
