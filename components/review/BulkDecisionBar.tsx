'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { bulkRecordDecision } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { FindingType, ProvenanceType } from '@/lib/types';

type BulkDecisionBarProps = {
  handoffId: string;
  findingType: FindingType;
  provenance: ProvenanceType;
  findingReferences: string[];
};

/**
 * One provenance tier at a time, never mixed — see AGENTS.md's
 * Non-Negotiable #2. This component only ever renders for a single,
 * already-filtered-by-provenance group, so there's no way to trigger it
 * across a mixed set from the UI; the server action re-verifies anyway.
 */
export function BulkDecisionBar({ handoffId, findingType, provenance, findingReferences }: BulkDecisionBarProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<'Confirm' | 'Reject' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!pendingAction) return;

    setIsSubmitting(true);
    setError(null);

    const result = await bulkRecordDecision({
      handoffId,
      findingType,
      provenance,
      action: pendingAction,
      findingReferences,
    });

    setIsSubmitting(false);
    setPendingAction(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[--color-text-secondary]">
          {findingReferences.length} {provenance} finding{findingReferences.length === 1 ? '' : 's'}
        </span>
        <Button type="button" variant="secondary" size="sm" onClick={() => setPendingAction('Confirm')}>
          Confirm all
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setPendingAction('Reject')}>
          Reject all
        </Button>
      </div>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {error}
        </p>
      )}
      <ConfirmDialog
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={() => void handleConfirm()}
        title={`${pendingAction ?? 'Confirm'} all ${findingReferences.length} ${provenance} finding${findingReferences.length === 1 ? '' : 's'}?`}
        description="This applies the same decision to every finding in this group at once. Each one still gets its own entry in the decision history."
        confirmLabel={pendingAction ?? 'Confirm'}
        variant={pendingAction === 'Reject' ? 'danger' : 'primary'}
        isConfirming={isSubmitting}
      />
    </div>
  );
}
