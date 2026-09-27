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
          DEFAULT: '#d4af37',
          dim: '#9a7b1a',
          light: '#f0c040',
          antique: '#c5a059',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        peakpro: ['var(--font-peakpro-serif)', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
