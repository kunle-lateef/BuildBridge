'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { AlertCircle } from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/ToastProvider';
import { useFieldErrors } from '@/components/ui/useFieldErrors';
import type { ActionResult } from '@/lib/types';
import { updateProfileSchema } from '@/lib/validators/settings';

type EditProfileFormProps = {
  initialName: string;
  email: string;
  action: (prevState: ActionResult<{ name: string }> | null, formData: FormData) => Promise<ActionResult<{ name: string }>>;
};

const initialState: ActionResult<{ name: string }> | null = null;

export function EditProfileForm({ initialName, email, action }: EditProfileFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(action, initialState);
  const { fieldProps } = useFieldErrors(updateProfileSchema);

  useEffect(() => {
    if (state?.ok) {
      toast('Profile updated');
      router.refresh();
    }
  }, [state, toast, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        // Remounts once the server value actually changes, so this
        // uncontrolled field's defaultValue picks up the saved name after
        // router.refresh() — defaultValue is otherwise only read on mount.
        key={initialName}
        id="profile-name"
        name="name"
        type="text"
        required
        label="Name"
        defaultValue={initialName}
        {...fieldProps('name')}
      />

      {/* Email is read-only: it's also the sign-in credential, so changing it
          needs its own verification step, not a plain text field. */}
      <div className="flex flex-col gap-1">
        <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">Email</span>
        <span className="text-[14px] leading-5 text-[--color-text-primary]">{email}</span>
        <span className="text-[12px] leading-4 text-[--color-text-secondary]">Used to sign in.</span>
      </div>

      {state && !state.ok && (
        <p role="alert" className="m-0 flex items-center gap-2 text-[14px] text-[--color-error]">
          <AlertCircle aria-hidden="true" size={16} />
          {state.error.message}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}
