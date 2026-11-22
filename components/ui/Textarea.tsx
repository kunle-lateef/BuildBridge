import type { ReactNode, TextareaHTMLAttributes } from 'react';

import { AlertCircle } from '@/components/ui/icons';
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
        <label htmlFor={id} className="text-[14px] font-medium leading-5 text-[--color-text-body]">
          {label}
        </label>
        {labelAction}
      </div>
      <textarea
        id={id}
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        className={cn(
          'rounded-[--radius-md] border border-[--color-border] bg-white px-3 py-2.5 text-[14px] leading-5 text-[--color-text-body] placeholder:text-[--color-text-muted]',
          error && 'border-[--color-error]',
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-[14px] font-medium leading-5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {error}
        </p>
      )}
    </div>
  );
}
