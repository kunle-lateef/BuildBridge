'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import { AuthNotice } from '@/components/marketing/AuthLayout';
import { Button } from '@/components/ui/Button';
import { AlertCircle, CheckCircle2 } from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
import { useFieldErrors } from '@/components/ui/useFieldErrors';
import { SESSION_EXPIRED_REASON, safeCallbackPath } from '@/lib/auth-redirect';
import type { ActionResult } from '@/lib/types';
import { signInSchema } from '@/lib/validators/auth';

import { signInAction } from './actions';

// Wording from Figma `02 — Auth` ("Sign in — wrong password", "— too many attempts").
const SIGN_IN_ERRORS: Record<string, { title: string; detail: string }> = {
  invalid_credentials: { title: 'Incorrect email or password', detail: 'Check both and try again.' },
  rate_limited: {
    title: 'Too many attempts',
    detail: 'Sign-in is paused for a few minutes to protect your account. Try again shortly, or reset your password now.',
  },
};

const initialState: ActionResult<{ success: true }> | null = null;

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(signInAction, initialState);
  const { fieldProps } = useFieldErrors(signInSchema);
  const passwordChanged = searchParams.get('passwordChanged') === '1';
  const sessionExpired = searchParams.get('reason') === SESSION_EXPIRED_REASON;

  useEffect(() => {
    if (state?.ok) {
      router.push(safeCallbackPath(searchParams.get('callbackUrl')));
      router.refresh();
    }
  }, [state, router, searchParams]);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {sessionExpired && !passwordChanged && !state && (
        <AuthNotice tone="info" icon={<AlertCircle aria-hidden="true" size={16} />} title="You were signed out">
          For security, sessions end after a while. Sign in again and you’ll go straight back to where you were.
        </AuthNotice>
      )}

      {passwordChanged && !state && (
        <AuthNotice tone="success" icon={<CheckCircle2 aria-hidden="true" size={14} />}>
          Password changed. Sign in with your new password.
        </AuthNotice>
      )}

      {state && !state.ok && (
        <AuthNotice tone="error" icon={<AlertCircle aria-hidden="true" size={14} />} title={SIGN_IN_ERRORS[state.error.code]?.title ?? state.error.message}>
          {SIGN_IN_ERRORS[state.error.code]?.detail}
        </AuthNotice>
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
        placeholder=""
        labelAction={
          <Link href="/forgot-password" className="text-[14px] leading-5 text-[--color-primary] underline">
            Forgot password?
          </Link>
        }
        {...fieldProps('password')}
      />

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="m-0 text-center text-[14px] leading-5 text-[--color-text-secondary]">
        New to BuildBridge?{' '}
        <Link href="/sign-up" className="text-[--color-primary] underline">
          Create account
        </Link>
      </p>
    </form>
  );
}
