import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind class names, resolving conflicts (e.g. a passed-in
 * `className` overriding a base padding class) the way `tailwind-merge`
 * expects. Every component accepts and merges `className` through this —
 * see .agents/skills/component-builder/SKILL.md.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
