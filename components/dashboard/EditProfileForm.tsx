'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/ToastProvider';
import { useFieldErrors } from '@/components/ui/useFieldErrors';
import type { ActionResult } from '@/lib/types';
import { updateProfileSchema } from '@/lib/validators/settings';

type EditProfileFormProps = {
  initialName: string;
  action: (prevState: ActionResult<{ name: string }> | null, formData: FormData) => Promise<ActionResult<{ name: string }>>;
};

const initialState: ActionResult<{ name: string }> | null = null;

export function EditProfileForm({ initialName, action }: EditProfileFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(action, initialState);
  const { fieldProps } = useFieldErrors(updateProfileSchema);

  useEffect(() => {
    if (state?.ok) {
      toast('Profile updated.');
      router.refresh();
    }
  }, [state, toast, router]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
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

      {state && !state.ok && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={16} />
          {state.error.message}
        </p>
      )}

      <Button type="submit" variant="secondary" size="sm" disabled={isPending} className="self-start">
        {isPending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  );
}
