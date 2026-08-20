import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[--radius-md] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        // Reserved for the highest-intent primary actions only — "Create
        // Handoff," "Share Handoff" — per design-system.md. Never use this
        // variant for anything else; use "primary" instead.
        // `bg-[image:var(...)]` (not `bg-[--gradient-primary]`) is required
        // here — without the `image:` type hint Tailwind treats a CSS-
        // variable arbitrary value as background-color, which silently
        // rejects a linear-gradient() value and renders fully transparent.
        cta: 'bg-[image:var(--gradient-primary)] text-white hover:opacity-90',
        primary: 'bg-[--color-primary] text-white hover:opacity-90',
        secondary: 'bg-[--color-surface] text-[--color-text-body] border border-[--color-border] hover:bg-[--color-border]',
        ghost: 'bg-transparent text-[--color-text-body] hover:bg-[--color-surface]',
        danger: 'bg-[--color-error] text-white hover:opacity-90',
        // For a CTA placed on a colored/dark surface (e.g. --color-primary-dark
        // band) where the usual light-surface variants above would be
        // invisible or low-contrast. Not for use on the normal page background.
        inverse: 'bg-white text-[--color-primary-dark] hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3 text-[length:var(--font-desktop-caption-medium-size)]',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

/**
 * Exported so a styled `<Link>` (navigation, not an action) can reuse the
 * exact same classes instead of hand-duplicating them — see MarketingHeader.
 */
export { buttonVariants };
