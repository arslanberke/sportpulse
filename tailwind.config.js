/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand palette. Theme-dependent tokens live as CSS variables in
        // src/global.css (light + dark values); brand accents stay fixed.
        // Logo'daki S harfinin nanesi. Acik zeminde metin olarak okunmadigi
        // icin `text-primary` asagida temaya gore ayri bir tona baglanir.
        primary: {
          DEFAULT: '#4DE3B5',
          dark: '#0F9C78',
          light: 'rgb(var(--color-primary-light) / <alpha-value>)',
        },
        'on-primary': '#081311',
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
        live: '#E5484D',
        success: {
          DEFAULT: '#34C759',
          light: 'rgb(var(--color-success-light) / <alpha-value>)',
        },
        warning: {
          DEFAULT: '#FF9500',
          light: 'rgb(var(--color-warning-light) / <alpha-value>)',
        },
      },
      textColor: {
        primary: 'rgb(var(--color-primary-text) / <alpha-value>)',
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
