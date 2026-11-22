'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';

import { AuthHeading, AuthNotice } from '@/components/marketing/AuthLayout';
import { PasswordRequirementsChecklist } from '@/components/marketing/PasswordRequirementsChecklist';
import { Button, buttonVariants } from '@/components/ui/Button';
import { AlertCircle } from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
import { useFieldErrors } from '@/components/ui/useFieldErrors';
import type { ActionResult } from '@/lib/types';
import { resetPasswordSchema } from '@/lib/validators/auth';

import { resetPassword } from './actions';

const initialState: ActionResult<{ reset: true }> | null = null;

type ResetPasswordFormProps = {
  token: string;
};

/** Figma `02 — Auth` → "Reset password". */
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(resetPassword, initialState);
  const { fieldProps } = useFieldErrors(resetPasswordSchema);
  const [password, setPassword] = useState('');
  const passwordFieldProps = fieldProps('password');

  useEffect(() => {
    if (state?.ok) {
      router.push('/handoffs');
      router.refresh();
    }
  }, [state, router]);

  if (state && !state.ok && state.error.code === 'invalid_token') {
    return <ResetLinkExpired />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <AuthHeading
        title="Set a new password"
        description="Saving your new password signs you in here and signs you out everywhere else."
      />
      <input type="hidden" name="token" value={token} />

      {state && !state.ok && (
        <AuthNotice tone="error" icon={<AlertCircle aria-hidden="true" size={14} />} title={state.error.message} />
      )}

      <div className="flex flex-col gap-2.5">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          label="New password"
          placeholder=""
          {...passwordFieldProps}
          value={password}
          onChange={(event) => {
            setPassword(event.currentTarget.value);
            passwordFieldProps.onChange(event);
          }}
        />
        <PasswordRequirementsChecklist password={password} />
      </div>

      <Input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        label="Confirm new password"
        placeholder="Re-enter your password"
        {...fieldProps('confirmPassword')}
      />

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save new password'}
      </Button>
    </form>
  );
}

/** Figma `02 — Auth` → "Reset password — link expired". Also shown when the link has no token. */
export function ResetLinkExpired() {
  return (
    <div className="flex flex-col gap-5">
      <AuthHeading
        title="This reset link doesn’t work"
        description="It may have expired or already been used. Reset links last 1 hour. Request a new one."
      />
      <Link href="/forgot-password" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
        Get a new reset link
      </Link>
      <Link href="/sign-in" className="text-center text-[14px] leading-5 text-[--color-primary] underline">
        Back to sign in
      </Link>
    </div>
  );
}
