'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/Button';
import { AlertCircle } from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
import { useFieldErrors } from '@/components/ui/useFieldErrors';
import type { ActionResult } from '@/lib/types';
import { changePasswordSchema } from '@/lib/validators/settings';

type ChangePasswordFormProps = {
  action: (prevState: ActionResult<{ changed: true }> | null, formData: FormData) => Promise<ActionResult<{ changed: true }>>;
};

const initialState: ActionResult<{ changed: true }> | null = null;

/**
 * No success branch to handle here — on success the action itself signs
 * this browser out and redirects to /sign-in (see actions.ts's comment on
 * why), so the only state this form ever actually renders is the error
 * path; a successful submission navigates away before there's a resolved
 * state to react to.
 */
export function ChangePasswordForm({ action }: ChangePasswordFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const { fieldProps } = useFieldErrors(changePasswordSchema);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        id="current-password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        label="Current password"
        {...fieldProps('currentPassword')}
      />

      <Input
        id="new-password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        label="New password"
        {...fieldProps('newPassword')}
      />

      <Input
        id="confirm-new-password"
        name="confirmNewPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        label="Confirm new password"
        {...fieldProps('confirmNewPassword')}
      />

      {state && !state.ok && (
        <p role="alert" className="m-0 flex items-center gap-2 text-[14px] text-[--color-error]">
          <AlertCircle aria-hidden="true" size={16} />
          {state.error.message}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? 'Changing…' : 'Change password'}
      </Button>
    </form>
  );
}
