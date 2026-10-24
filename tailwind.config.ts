import type { Config } from 'tailwindcss';

// Color, spacing, radius, and border-width values are consumed directly from
// tokens/tokens.css's CSS custom properties via Tailwind's arbitrary-value
// syntax (e.g. `bg-[--color-primary]`, `p-[--spacing-4]`) per design-system.md.
// This file intentionally does not duplicate those tokens into the Tailwind
// theme — tokens.css is the single source of truth and is regenerated from
// the Figma export, never hand-edited.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // next/font-loaded variables first, falling back to the literal
        // families tokens.css's --font-family-base names. JetBrains Mono has
        // no generated token yet (design-system.md) so it's configured here
        // directly per that doc's guidance.
        sans: ['var(--font-sans)', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      keyframes: {
        // A one-shot ring that expands and fades off a HeroHandoffLoop action
        // button the instant the demo cursor clicks it.
        'confirm-ripple': {
          '0%': { opacity: '0.55', transform: 'scale(0.4)' },
          '100%': { opacity: '0', transform: 'scale(1.7)' },
        },
      },
      animation: {
        'confirm-ripple': 'confirm-ripple 450ms ease-out 1 forwards',
      },
    },
  },
  plugins: [],
};

export default config;
