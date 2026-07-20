/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand palette. Theme-dependent tokens live as CSS variables in
        // src/global.css (light + dark values); brand accents stay fixed.
        primary: {
          DEFAULT: '#10B981',
          dark: '#047857',
          light: 'rgb(var(--color-primary-light) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          raised: 'rgb(var(--color-surface-raised) / <alpha-value>)',
        },
        line: 'rgb(var(--color-border) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)',
          secondary: 'rgb(var(--color-ink-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--color-ink-tertiary) / <alpha-value>)',
        },
        danger: '#FF3B30',
        success: {
          DEFAULT: '#34C759',
          light: 'rgb(var(--color-success-light) / <alpha-value>)',
        },
        warning: {
          DEFAULT: '#FF9500',
          light: 'rgb(var(--color-warning-light) / <alpha-value>)',
        },
      },
      borderRadius: {
        card: '24px',
        button: '16px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
