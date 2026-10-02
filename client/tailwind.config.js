/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#F6F8FA',
          secondary: '#F1F4F7',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          elevated: '#FFFFFF',
          subtle: '#F6F8FA',
        },
        navy: {
          DEFAULT: '#12355B',
          dark: '#0B2545',
          light: '#1B4777',
        },
        teal: {
          DEFAULT: '#167D8D',
          light: '#E8F5F6',
          hover: '#116572',
        },
        text: {
          primary: '#172033',
          secondary: '#64748B',
          muted: '#94A3B8',
        },
        border: {
          DEFAULT: '#E2E8F0',
          subtle: '#EDF2F7',
          strong: '#CBD5E1',
        },
        semantic: {
          success: '#16805C',
          warning: '#B7791F',
          danger: '#C53D3D',
          info: '#2563EB',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'modal': '0 10px 25px -5px rgba(11, 37, 69, 0.15), 0 8px 10px -6px rgba(11, 37, 69, 0.1)',
      },
      borderRadius: {
        'control': '8px',
        'btn': '8px',
        'input': '8px',
        'card': '10px',
        'modal': '12px',
      }
    },
  },
  plugins: [],
}
