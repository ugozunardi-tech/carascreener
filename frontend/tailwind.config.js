/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   '#080c18',
          secondary: '#0d1120',
          tertiary:  '#141929',
          card:      '#0f1524',
        },
        accent: {
          cyan:    '#00d4ff',
          green:   '#00e676',
          red:     '#ff3b3b',
          yellow:  '#ffd700',
          orange:  '#ff8c00',
          purple:  '#a78bfa',
          pink:    '#f472b6',
        },
        text: {
          primary:   '#e2e8f0',
          secondary: '#8892a4',
          muted:     '#3d4a5c',
        },
        border: {
          primary:   '#1a2540',
          secondary: '#222e45',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 80s linear infinite',
      },
    },
  },
  plugins: [],
}
