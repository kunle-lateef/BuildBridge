'use client';

import { AlertCircle } from 'lucide-react';
import { useActionState } from 'react';

import type { ActionResult } from '@/lib/types';

import { requestPasswordReset } from './actions';

const initialState: ActionResult<{ requested: true }> | null = null;

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);

  if (state?.ok) {
    return (
      <p role="status" className="text-[--color-success]">
        If an account exists for that email, a reset link is on its way. Check your inbox.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[--color-text-body]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-3 py-2 text-[--color-text-body] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        />
      </div>

      {state && !state.ok && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={16} />
          {state.error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-[--radius-md] bg-[--color-primary] px-4 py-2 font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] disabled:opacity-60"
      >
        {isPending ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}
