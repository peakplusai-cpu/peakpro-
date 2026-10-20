import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ice: {
          DEFAULT: '#e6f9ff',
          dim: '#9db4c6',
          mute: '#62788c',
        },
        signal: {
          DEFAULT: '#4df0ff',
          dim: '#1bb6c9',
        },
        plasma: {
          DEFAULT: '#b794ff',
          dim: '#8461f2',
        },
        warn: '#ffb04a',
        void: {
          DEFAULT: '#04060c',
          panel: '#091022',
        },
        zinc: {
          50: '#f2f9fc',
          100: '#e1eef4',
          200: '#c5d8e2',
          300: '#9fb7c6',
          400: '#7d95a7',
          500: '#5d7487',
          600: '#43566a',
          700: '#2e3e50',
          800: '#1d2937',
          900: '#111a26',
          950: '#0a111b',
        },
      },
      fontFamily: {
        sans: ['var(--font-peakpro-sans)', 'Noto Sans TC', 'system-ui', 'sans-serif'],
        peakpro: ['var(--font-peakpro-display)', 'Noto Sans TC', 'system-ui', 'sans-serif'],
        mono: ['var(--font-peakpro-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
