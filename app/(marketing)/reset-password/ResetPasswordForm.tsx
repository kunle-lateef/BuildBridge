'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useFieldErrors } from '@/components/ui/useFieldErrors';
import type { ActionResult } from '@/lib/types';
import { resetPasswordSchema } from '@/lib/validators/auth';

import { resetPassword } from './actions';

const initialState: ActionResult<{ reset: true }> | null = null;

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(resetPassword, initialState);
  const { fieldProps } = useFieldErrors(resetPasswordSchema);

  useEffect(() => {
    if (state?.ok) {
      router.push('/handoffs');
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />

      <Input
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        label="New password"
        placeholder="At least 8 characters"
        {...fieldProps('password')}
      />

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

      {state && !state.ok && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={16} />
          {state.error.message}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Resetting…' : 'Reset password'}
      </Button>
    </form>
  );
}
