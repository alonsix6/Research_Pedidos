import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta OP-1
        'op1-bg': '#E8E8E8',
        'op1-card': '#FFFFFF',
        'op1-text': '#2A2A2A',
        'op1-text-secondary': '#666666',
        'op1-accent': '#FF4500',
        'op1-success': '#00CC66',
        'op1-warning': '#FFA500',
        'op1-button': '#3A3A3A',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        op1: '0 2px 4px rgba(0, 0, 0, 0.1)',
        'op1-pressed': 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
};

export default config;
