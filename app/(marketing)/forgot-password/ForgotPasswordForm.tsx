'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useFieldErrors } from '@/components/ui/useFieldErrors';
import type { ActionResult } from '@/lib/types';
import { requestPasswordResetSchema } from '@/lib/validators/auth';

import { requestPasswordReset } from './actions';

const initialState: ActionResult<{ requested: true }> | null = null;

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);
  const { fieldProps } = useFieldErrors(requestPasswordResetSchema);

  if (state?.ok) {
    return (
      <p role="status" className="text-[--color-success]">
        If an account exists for that email, a reset link is on its way. Check your inbox.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
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

      {state && !state.ok && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={16} />
          {state.error.message}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Sending…' : 'Send reset link'}
      </Button>

      <Link href="/sign-in" className="text-center text-[--color-primary] underline">
        Back to login
      </Link>
    </form>
  );
}
