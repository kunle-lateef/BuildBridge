'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';

import { PasswordRequirementsChecklist } from '@/components/marketing/PasswordRequirementsChecklist';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useFieldErrors } from '@/components/ui/useFieldErrors';
import type { ActionResult } from '@/lib/types';
import { signUpSchema } from '@/lib/validators/auth';

import { signUp } from './actions';

const initialState: ActionResult<{ success: true }> | null = null;

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

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <Input
        id="name"
        name="name"
        type="text"
        autoComplete="name"
        required
        label="Name"
        placeholder="Jane Doe"
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

      <Input
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        label="Password"
        placeholder="At least 8 characters"
        {...passwordFieldProps}
        value={password}
        onChange={(event) => {
          setPassword(event.currentTarget.value);
          passwordFieldProps.onChange(event);
        }}
        onFocus={() => setHasFocusedPassword(true)}
      />

      {hasFocusedPassword && <PasswordRequirementsChecklist password={password} />}

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

      {state && !state.ok && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={16} />
          {state.error.message}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-[--color-text-muted]">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>

      <p className="text-center text-[--color-text-secondary]">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-[--color-primary] underline">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}
