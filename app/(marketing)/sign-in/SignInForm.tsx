'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import type { ActionResult } from '@/lib/types';

import { signInAction } from './actions';

const initialState: ActionResult<{ success: true }> | null = null;

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  useEffect(() => {
    if (state?.ok) {
      router.push(searchParams.get('callbackUrl') ?? '/handoffs');
      router.refresh();
    }
  }, [state, router, searchParams]);

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

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-[--color-text-body]">
            Password
          </label>
          <Link href="/forgot-password" className="text-[--color-primary] underline">
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
