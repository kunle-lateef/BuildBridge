'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';

import { AuthNotice } from '@/components/marketing/AuthLayout';
import { PasswordRequirementsChecklist } from '@/components/marketing/PasswordRequirementsChecklist';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
import { useFieldErrors } from '@/components/ui/useFieldErrors';
import type { ActionResult } from '@/lib/types';
import { signUpSchema } from '@/lib/validators/auth';

import { signUp } from './actions';

const initialState: ActionResult<{ success: true }> | null = null;

// Wording from Figma `02 — Auth` ("Sign up — email can't be used"). The
// action deliberately doesn't say whether the email already has an account.
const EMAIL_UNUSABLE = {
  title: 'We couldn’t create an account with that email',
  detail: 'If you already have an account, sign in or reset your password.',
};

export function SignUpForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(signUp, initialState);
  const { fieldProps } = useFieldErrors(signUpSchema);
  const [password, setPassword] = useState('');
  const [hasFocusedPassword, setHasFocusedPassword] = useState(false);
  const passwordFieldProps = fieldProps('password');

  useEffect(() => {
    if (state?.ok) {
      router.push('/handoffs');
      router.refresh();
    }
  }, [state, router]);

  const isEmailUnusable = state && !state.ok && state.error.message === 'Could not create an account with that email.';

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state && !state.ok && (
        <AuthNotice
          tone="error"
          icon={<AlertCircle aria-hidden="true" size={14} />}
          title={isEmailUnusable ? EMAIL_UNUSABLE.title : state.error.message}
        >
          {isEmailUnusable ? EMAIL_UNUSABLE.detail : undefined}
        </AuthNotice>
      )}

      <Input
        id="name"
        name="name"
        type="text"
        autoComplete="name"
        required
        label="Name"
        placeholder="Your name"
        {...fieldProps('name')}
      />

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

      <div className="flex flex-col gap-2.5">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          label="Password"
          placeholder=""
          {...passwordFieldProps}
          value={password}
          onChange={(event) => {
            setPassword(event.currentTarget.value);
            passwordFieldProps.onChange(event);
          }}
          onFocus={() => setHasFocusedPassword(true)}
        />
        {hasFocusedPassword && <PasswordRequirementsChecklist password={password} />}
      </div>

      <Input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        label="Confirm password"
        placeholder="Re-enter your password"
        {...fieldProps('confirmPassword')}
      />

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="m-0 text-center text-[12px] leading-4 text-[--color-text-secondary]">
        By creating an account, you agree to the{' '}
        <Link href="/terms" className="underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>

      <p className="m-0 text-center text-[14px] leading-5 text-[--color-text-secondary]">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-[--color-primary] underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
