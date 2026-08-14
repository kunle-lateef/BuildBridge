'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import { createHandoff } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import type { ActionResult } from '@/lib/types';

const initialState: ActionResult<{ id: string }> | null = null;

export function CreateHandoffForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createHandoff, initialState);

  useEffect(() => {
    if (state?.ok) {
      router.push(`/handoffs/${state.data.id}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-[--radius-lg] border border-[--color-border] p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="handoff-name" className="text-[--color-text-body]">
          Handoff name
        </label>
        <input
          id="handoff-name"
          name="name"
          type="text"
          required
          placeholder="e.g. Onboarding flow redesign"
          className="rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-3 py-2 text-[--color-text-body] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="handoff-description" className="text-[--color-text-body]">
          Description <span className="text-[--color-text-muted]">(optional)</span>
        </label>
        <textarea
          id="handoff-description"
          name="description"
          rows={2}
          className="rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-3 py-2 text-[--color-text-body] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        />
      </div>

      {state && !state.ok && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={16} />
          {state.error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-[--radius-md] bg-[--gradient-primary] px-4 py-2 font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] disabled:opacity-60"
      >
        {isPending ? 'Creating…' : 'Create Handoff'}
      </button>
    </form>
  );
}
