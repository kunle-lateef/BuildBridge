import { AlertCircle } from 'lucide-react';
import type { ReactNode, TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: ReactNode;
  error?: string;
  labelAction?: ReactNode;
  /** Keeps the label in the accessibility tree but hides it visually. */
  hideLabel?: boolean;
};

export function Textarea({ label, error, labelAction, hideLabel, id, className, ...props }: TextareaProps) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn('flex items-center justify-between', hideLabel && 'sr-only')}>
        <label htmlFor={id} className="text-[--color-text-body]">
          {label}
        </label>
        {labelAction}
      </div>
      <textarea
        id={id}
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        className={cn(
          'rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-3 py-2 text-[--color-text-body] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]',
          error && 'border-[--color-error]',
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {error}
        </p>
      )}
    </div>
  );
}
