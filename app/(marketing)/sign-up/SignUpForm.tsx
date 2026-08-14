'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';

import type { ActionResult } from '@/lib/types';

import { signUp } from './actions';

const initialState: ActionResult<{ email: string }> | null = null;

const inputClassName =
  'rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-3 py-2 text-[--color-text-body] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]';
const labelClassName = 'text-[--color-text-body]';

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  if (state?.ok) {
    return (
      <p role="status" className="text-[--color-success]">
        Account created.{' '}
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
        .
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={labelClassName}>
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className={inputClassName}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelClassName}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClassName}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={labelClassName}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClassName}
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
        {isPending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
