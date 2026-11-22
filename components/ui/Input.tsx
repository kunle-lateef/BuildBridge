'use client';

import { useState, type InputHTMLAttributes, type ReactNode } from 'react';

import { AlertCircle, Eye, EyeOff } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  error?: string;
  /** Extra content rendered on the label row, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode;
  /** Keeps the label in the accessibility tree but hides it visually. */
  hideLabel?: boolean;
};

export function Input({ label, error, labelAction, hideLabel, id, className, type, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const errorId = error ? `${id}-error` : undefined;
  // Every type="password" field gets a visibility toggle for free — a typo
  // in a field you can't read back is a common, avoidable source of failed
  // sign-ins/sign-ups.
  const isPassword = type === 'password';

  return (
    // w-full here (not on the inner <input>'s own className) is what makes
    // this actually stretch in a flex-row context like AssistantPanel's
    // message-input row — this outer div is the real flex item; a caller
    // passing className="flex-1" needs it to land here, not on the input
    // three levels down, or the grow has nothing to act on.
    // Sizes follow Figma's Input component (Foundations): 14/20 medium
    // label, 42px field, 14/20 value, 6px between label and field.
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      <div className={cn('flex items-center justify-between', hideLabel && 'sr-only')}>
        <label htmlFor={id} className="text-[14px] font-medium leading-5 text-[--color-text-body]">
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <input
          id={id}
          type={isPassword && showPassword ? 'text' : type}
          aria-describedby={errorId}
          aria-invalid={error ? true : undefined}
          className={cn(
            'h-[42px] w-full rounded-[--radius-md] border border-[--color-border] bg-white px-3 text-[14px] leading-5 text-[--color-text-body] placeholder:text-[--color-text-muted]',
            isPassword && 'pr-10',
            error && 'border-[--color-error]',
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-[--color-text-muted] hover:text-[--color-text-secondary]"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-[14px] font-medium leading-5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {error}
        </p>
      )}
    </div>
  );
}
