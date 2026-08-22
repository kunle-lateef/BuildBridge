'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import { createHandoff } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useFieldErrors } from '@/components/ui/useFieldErrors';
import type { ActionResult } from '@/lib/types';
import { createHandoffSchema } from '@/lib/validators/handoff';

const initialState: ActionResult<{ id: string }> | null = null;

type CreateHandoffFormProps = {
  onCancel: () => void;
};

export function CreateHandoffForm({ onCancel }: CreateHandoffFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createHandoff, initialState);
  const { fieldProps } = useFieldErrors(createHandoffSchema);

  useEffect(() => {
    if (state?.ok) {
      router.push(`/handoffs/${state.data.id}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Input
        id="handoff-name"
        name="name"
        type="text"
        required
        placeholder="e.g. Onboarding flow redesign"
        label="Handoff name"
        {...fieldProps('name')}
      />

      <Textarea
        id="handoff-description"
        name="description"
        rows={4}
        label={
          <>
            Description <span className="text-[--color-text-muted]">(optional)</span>
          </>
        }
        {...fieldProps('description')}
      />

      {state && !state.ok && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={16} />
          {state.error.message}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="cta" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create Handoff'}
        </Button>
      </div>
    </form>
  );
}
