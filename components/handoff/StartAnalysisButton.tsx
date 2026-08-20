'use client';

import { AlertCircle } from 'lucide-react';
import { useActionState } from 'react';

import { startAnalysis } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import type { ActionResult } from '@/lib/types';

const initialState: ActionResult<{ analysisRunId: string }> | null = null;

type StartAnalysisButtonProps = {
  handoffId: string;
};

export function StartAnalysisButton({ handoffId }: StartAnalysisButtonProps) {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: typeof initialState) => startAnalysis(handoffId),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? 'Starting…' : 'Start Analysis'}
      </Button>
      {state && !state.ok && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={16} />
          {state.error.message}
        </p>
      )}
    </form>
  );
}
