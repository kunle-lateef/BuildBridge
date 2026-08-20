import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Adds a shadow for cards that float above a busy background (modals, dropdowns). */
  floating?: boolean;
};

export function Card({ floating, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[--radius-lg] border border-[--color-border] bg-[--color-background] p-4',
        floating && 'shadow-lg',
        className,
      )}
      {...props}
    />
  );
}
