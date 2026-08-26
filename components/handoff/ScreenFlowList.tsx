'use client';

import { AlertCircle, ArrowRight, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createScreenFlow, deleteScreenFlow } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/ToastProvider';

type ScreenFlowItem = {
  id: string;
  sourceScreenName: string;
  targetScreenName: string;
  label: string | null;
};

type ScreenOption = { id: string; name: string };

type ScreenFlowListProps = {
  handoffId: string;
  screens: ScreenOption[];
  flows: ScreenFlowItem[];
};

const selectClassName =
  'h-10 rounded-[--radius-md] border border-[--color-border] bg-[--color-background] px-3 text-[--color-text-body] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]';

/**
 * "This screen leads to that screen" — always designer-authored, since
 * navigation intent isn't reliably inferable from a static screenshot the
 * way components/specs are. See ScreenFlow's schema comment for why this
 * is a dedicated model rather than a DesignerNote extension.
 */
export function ScreenFlowList({ handoffId, screens, flows }: ScreenFlowListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [sourceScreenId, setSourceScreenId] = useState(screens[0]?.id ?? '');
  const [targetScreenId, setTargetScreenId] = useState(screens[1]?.id ?? screens[0]?.id ?? '');
  const [label, setLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (screens.length < 2) {
    return null;
  }

  const sameScreenError =
    sourceScreenId === targetScreenId ? 'A screen cannot lead to itself.' : undefined;

  async function handleAdd() {
    setIsSubmitting(true);
    setError(null);

    const result = await createScreenFlow({
      handoffId,
      sourceScreenId,
      targetScreenId,
      label: label.trim() || undefined,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setLabel('');
    toast('Flow added.');
    router.refresh();
  }

  async function handleDelete(flowId: string) {
    setDeletingId(flowId);
    await deleteScreenFlow(flowId);
    setDeletingId(null);
    toast('Flow removed.');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[--color-text-secondary]">Screen flow</h3>

      {flows.length === 0 && <p className="text-[--color-text-muted]">No flows defined yet.</p>}

      {flows.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {flows.map((flow) => (
            <li
              key={flow.id}
              className="flex items-center gap-2 rounded-[--radius-md] border border-[--color-border] px-3 py-2"
            >
              <span className="text-[--color-text-body]">{flow.sourceScreenName}</span>
              <ArrowRight aria-hidden="true" size={14} className="text-[--color-text-muted]" />
              <span className="text-[--color-text-body]">{flow.targetScreenName}</span>
              {flow.label && <span className="text-[--color-text-secondary]">— {flow.label}</span>}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove flow from ${flow.sourceScreenName} to ${flow.targetScreenName}`}
                onClick={() => void handleDelete(flow.id)}
                disabled={deletingId === flow.id}
                className="ml-auto"
              >
                <Trash2 aria-hidden="true" size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[--color-text-body]">From</span>
          <select
            value={sourceScreenId}
            onChange={(event) => setSourceScreenId(event.target.value)}
            className={selectClassName}
          >
            {screens.map((screen) => (
              <option key={screen.id} value={screen.id}>
                {screen.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[--color-text-body]">To</span>
          <select
            value={targetScreenId}
            onChange={(event) => setTargetScreenId(event.target.value)}
            className={selectClassName}
          >
            {screens.map((screen) => (
              <option key={screen.id} value={screen.id}>
                {screen.name}
              </option>
            ))}
          </select>
        </label>
        <Input
          id="screen-flow-label"
          label="Label (optional)"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="e.g. Tap “Checkout”"
          maxLength={200}
        />
        <Button type="button" onClick={() => void handleAdd()} disabled={isSubmitting || !!sameScreenError}>
          {isSubmitting ? 'Adding…' : 'Add'}
        </Button>
      </div>
      {sameScreenError && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {sameScreenError}
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[--color-error]">
          <AlertCircle aria-hidden="true" size={14} />
          {error}
        </p>
      )}
    </div>
  );
}
