'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';

import type { ActionResult } from '@/lib/types';

import { resetPassword } from './actions';

const initialState: ActionResult<{ reset: true }> | null = null;

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(resetPassword, initialState);

  if (state?.ok) {
    return (
      <p role="status" className="text-[--color-success]">
        Password updated.{' '}
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
        .
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-[--color-text-body]">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
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
        {isPending ? 'Saving…' : 'Reset password'}
      </button>
    </form>
  );
}
