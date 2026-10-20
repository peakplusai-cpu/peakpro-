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
          DEFAULT: '#e8dfd0',
          dim: '#8a8174',
          light: '#f7f1e6',
          antique: '#9a8f7e',
        },
        phosphor: {
          DEFAULT: '#ff3b30',
          dim: '#c81e16',
        },
        ink: {
          DEFAULT: '#080704',
          panel: '#100e0c',
        },
      },
      fontFamily: {
        sans: ['var(--font-peakpro-sans)', 'Noto Sans TC', 'system-ui', 'sans-serif'],
        peakpro: ['var(--font-peakpro-serif)', 'var(--font-peakpro-sans)', 'Georgia', 'serif'],
        mono: ['var(--font-peakpro-mono)', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
