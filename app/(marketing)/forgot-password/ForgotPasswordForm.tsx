'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

import { AuthHeading, AuthNotice } from '@/components/marketing/AuthLayout';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Mail } from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
import { useFieldErrors } from '@/components/ui/useFieldErrors';
import type { ActionResult } from '@/lib/types';
import { requestPasswordResetSchema } from '@/lib/validators/auth';

import { requestPasswordReset } from './actions';

const initialState: ActionResult<{ requested: true }> | null = null;

const backToSignIn = (
  <Link href="/sign-in" className="text-center text-[14px] leading-5 text-[--color-primary] underline">
    Back to sign in
  </Link>
);

/**
 * Figma `02 — Auth` → "Forgot password" and "Forgot password — link sent".
 * The success wording never confirms whether the email has an account,
 * matching the action (which answers the same either way).
 */
export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);
  const { fieldProps } = useFieldErrors(requestPasswordResetSchema);
  const [email, setEmail] = useState('');

  if (state?.ok) {
    return (
      <form action={formAction} className="flex flex-col gap-5">
        <AuthHeading title="Check your email" />
        <AuthNotice tone="success" icon={<Mail aria-hidden="true" size={14} />}>
          If {email} has a BuildBridge account, a reset link is on its way. It expires in 1 hour.
        </AuthNotice>
        <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">
          Not in your inbox? Check spam, or send it again.
        </p>
        <input type="hidden" name="email" value={email} />
        <Button type="submit" variant="secondary" size="lg" disabled={isPending}>
          {isPending ? 'Sending…' : 'Resend link'}
        </Button>
        {backToSignIn}
      </form>
    );
  }

  const emailProps = fieldProps('email');

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <AuthHeading title="Reset your password" description="We’ll email you a link to set a new one." />

      {state && !state.ok && (
        <AuthNotice tone="error" icon={<AlertCircle aria-hidden="true" size={14} />} title={state.error.message} />
      )}

      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        label="Email"
        placeholder="you@company.com"
        {...emailProps}
        value={email}
        onChange={(event) => {
          setEmail(event.currentTarget.value);
          emailProps.onChange(event);
        }}
      />

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? 'Sending…' : 'Send reset link'}
      </Button>

      {backToSignIn}
    </form>
  );
}
