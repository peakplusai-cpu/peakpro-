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
        gold: {
          DEFAULT: '#e4c15a',
          dim: '#9a7b1a',
          light: '#f3e0a0',
          antique: '#c5a059',
        },
        phosphor: {
          DEFAULT: '#5eead4',
          dim: '#2dd4bf',
        },
        ink: {
          DEFAULT: '#07080b',
          panel: '#0c1016',
        },
      },
      fontFamily: {
        sans: ['var(--font-peakpro-sans)', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        peakpro: ['var(--font-peakpro-serif)', 'Syne', 'sans-serif'],
        mono: ['var(--font-peakpro-mono)', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
