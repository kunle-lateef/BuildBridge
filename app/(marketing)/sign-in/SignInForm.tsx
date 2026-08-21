'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useFieldErrors } from '@/components/ui/useFieldErrors';
import type { ActionResult } from '@/lib/types';
import { signInSchema } from '@/lib/validators/auth';

import { signInAction } from './actions';

const initialState: ActionResult<{ success: true }> | null = null;

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(signInAction, initialState);
  const { fieldProps } = useFieldErrors(signInSchema);
  const passwordChanged = searchParams.get('passwordChanged') === '1';

  useEffect(() => {
    if (state?.ok) {
      router.push(searchParams.get('callbackUrl') ?? '/handoffs');
      router.refresh();
    }
  }, [state, router, searchParams]);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {passwordChanged && !state && (
        <p role="status" className="flex items-center gap-1.5 text-[--color-success]">
          <CheckCircle2 aria-hidden="true" size={16} />
          Password changed. Sign in with your new password.
        </p>
      )}

      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        label="Email"
        placeholder="you@company.com"
        {...fieldProps('email')}
      />

      <Input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        label="Password"
        placeholder="Your password"
        labelAction={
          <Link href="/forgot-password" className="text-[--color-primary] underline">
            Forgot password?
          </Link>
        }
        {...fieldProps('password')}
      />

      {state && !state.ok && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={16} />
          {state.error.message}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="text-center text-[--color-text-secondary]">
        Don&apos;t have an account?{' '}
        <Link href="/sign-up" className="text-[--color-primary] underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
