'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { addDesignerNote } from '@/app/(dashboard)/handoffs/[handoffId]/actions';
import { openAssistant, type AskAbout } from '@/components/review/assistantEvents';
import type { ComponentStateItem } from '@/components/review/ComponentStateList';
import { DecisionControls } from '@/components/review/DecisionControls';
import { Button } from '@/components/ui/Button';
import { AlertCircle, ArrowDown, ArrowRight, Check, MessageSquare, StickyNote } from '@/components/ui/icons';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/ToastProvider';
import { cn } from '@/lib/cn';
import type { FindingType, ProvenanceType, ReviewStatus } from '@/lib/types';

export type SpecificationItem = {
  id: string;
  property: string;
  value: string;
  unit?: string | null;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  isImplemented: boolean;
};

type ComponentReviewCardProps = {
  handoffId: string;
  id: string;
  name: string;
  type: string;
  description: string | null;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  isImplemented: boolean;
  specifications: SpecificationItem[];
  states: ComponentStateItem[];
  /** The component's pin number on its screen, matching the canvas. */
  pinNumber?: number | null;
  defaultOpen?: boolean;
};

type Row = {
  findingType: FindingType;
  id: string;
  label: string;
  value: string;
  isMono: boolean;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  isImplemented: boolean;
};

const GROUP_ORDER: ProvenanceType[] = ['Detected', 'Inferred', 'Suggested'];
const GROUP_COLOR: Record<ProvenanceType, string> = {
  Detected: 'text-[--color-detected]',
  Inferred: 'text-[--color-inferred]',
  Suggested: 'text-[--color-ai-suggested]',
};
const PIN_STYLE: Record<ProvenanceType, string> = {
  Detected: 'border-solid border-[--color-detected] text-[--color-detected]',
  Inferred: 'border-dashed border-[--color-inferred] text-[--color-inferred]',
  Suggested: 'border-dotted border-[--color-ai-suggested] text-[--color-ai-suggested]',
};

/**
 * One component in the Findings panel (Figma `04 — Handoff`). Collapsed:
 * pin, name, a one-line summary and its provenance. Open: the component
 * itself, then its specifications and states, each grouped by provenance
 * under a coloured label. Selecting a row shows Confirm / Modify / Reject
 * for that one finding; provenance and review status stay visible on every
 * row (AGENTS.md #2).
 */
export function ComponentReviewCard({
  handoffId,
  id,
  name,
  type,
  description,
  provenance,
  reviewStatus,
  isImplemented,
  specifications,
  states,
  pinNumber,
  defaultOpen = false,
}: ComponentReviewCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const implementedCount =
    specifications.filter((spec) => spec.isImplemented).length + states.filter((state) => state.isImplemented).length;
  const summary = [
    type,
    `${specifications.length} ${specifications.length === 1 ? 'spec' : 'specs'}`,
    `${states.length} ${states.length === 1 ? 'state' : 'states'}`,
    implementedCount > 0 ? `${implementedCount} implemented` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const componentRow: Row = {
    findingType: 'Component',
    id,
    label: 'Component',
    value: description ?? type,
    isMono: false,
    provenance,
    reviewStatus,
    isImplemented,
  };
  const specRows: Row[] = specifications.map((spec) => ({
    findingType: 'Specification',
    id: spec.id,
    label: spec.property,
    value: `${spec.value}${spec.unit ?? ''}`,
    isMono: true,
    provenance: spec.provenance,
    reviewStatus: spec.reviewStatus,
    isImplemented: spec.isImplemented,
  }));
  const stateRows: Row[] = states.map((state) => ({
    findingType: 'ComponentState',
    id: state.id,
    label: state.name,
    value: state.description ?? '',
    isMono: false,
    provenance: state.provenance,
    reviewStatus: state.reviewStatus,
    isImplemented: state.isImplemented,
  }));

  function renderGroup(title: string, rows: Row[]) {
    if (rows.length === 0) return null;
    return (
      <div className="flex flex-col">
        <span className="px-4 pb-0.5 pt-3 text-[12px] font-medium leading-4 tracking-[0.2px] text-[--color-text-primary]">
          {title}
        </span>
        {GROUP_ORDER.map((group) => {
          const groupRows = rows.filter((row) => row.provenance === group);
          if (groupRows.length === 0) return null;
          return (
            <div key={group} className="flex flex-col">
              <span className="flex items-center gap-2 px-4 pb-0.5 pt-2">
                <span className={cn('text-[12px] font-semibold uppercase leading-4 tracking-[1.5px]', GROUP_COLOR[group])}>
                  {group}
                </span>
                <span className="text-[12px] leading-4 text-[--color-text-secondary]">{groupRows.length}</span>
              </span>
              {groupRows.map((row) => (
                <FindingRow
                  key={`${row.findingType}:${row.id}`}
                  row={row}
                  isSelected={selectedKey === `${row.findingType}:${row.id}`}
                  onSelect={() =>
                    setSelectedKey((current) =>
                      current === `${row.findingType}:${row.id}` ? null : `${row.findingType}:${row.id}`,
                    )
                  }
                />
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      id={`component-${id}`}
      className={cn(
        'scroll-mt-20 overflow-hidden rounded-[8px] border bg-white',
        isOpen ? 'border-[1.5px] border-[--color-primary]' : 'border-[--color-border]',
      )}
    >
      <button
        type="button"
        data-review-nav="component"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className={cn('flex w-full items-center gap-3 px-4 py-3 text-left', isOpen && 'border-b border-[--color-border]')}
      >
        {pinNumber ? (
          <span
            className={cn(
              'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 bg-white text-[12px] font-medium leading-4',
              PIN_STYLE[provenance],
            )}
          >
            {pinNumber}
          </span>
        ) : (
          <span className="h-6 w-6 shrink-0" />
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-medium leading-5 text-[--color-text-primary]">{name}</span>
          <span className="truncate text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">{summary}</span>
        </span>
        {!isOpen && <ProvenanceBadge provenance={provenance} />}
        {isOpen ? (
          <ArrowDown aria-hidden="true" size={16} className="shrink-0 text-[--color-text-secondary]" />
        ) : (
          <ArrowRight aria-hidden="true" size={16} className="shrink-0 text-[--color-text-secondary]" />
        )}
      </button>

      {isOpen && (
        <div className="flex flex-col">
          {renderGroup('This component', [componentRow])}
          {renderGroup('Specifications', specRows)}
          {renderGroup('States', stateRows)}
          <CardFooter
            handoffId={handoffId}
            componentId={id}
            componentName={name}
            selectedRow={[componentRow, ...specRows, ...stateRows].find((row) => `${row.findingType}:${row.id}` === selectedKey) ?? null}
          />
        </div>
      )}
    </div>
  );
}

function FindingRow({ row, isSelected, onSelect }: { row: Row; isSelected: boolean; onSelect: () => void }) {
  return (
    <div data-finding-row className={cn('flex flex-col gap-2 px-4 py-2 pr-3', isSelected && 'bg-[--color-background]')}>
      <button type="button" data-review-nav="row" onClick={onSelect} aria-expanded={isSelected} className="flex items-center gap-2 text-left">
        <span className="w-[96px] shrink-0 truncate text-[14px] leading-5 text-[--color-text-secondary]">{row.label}</span>
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-[--color-text-primary]',
            row.isMono ? 'font-mono text-[13px] leading-[18px]' : 'text-[14px] leading-5',
          )}
        >
          {row.value}
        </span>
        {row.isImplemented && (
          <span className="flex shrink-0 items-center gap-1 text-[12px] leading-4 tracking-[0.2px] text-[--color-success]">
            <Check aria-hidden="true" size={12} />
            Implemented
          </span>
        )}
        {row.reviewStatus === 'Unreviewed' ? (
          <span className="shrink-0 text-[12px] leading-4 tracking-[0.2px] text-[--color-text-secondary]">Not reviewed</span>
        ) : (
          <ReviewStatusBadge status={row.reviewStatus} />
        )}
      </button>
      {isSelected && (
        <DecisionControls
          findingType={row.findingType}
          findingReference={row.id}
          currentValue={row.value}
          className="pl-[104px]"
        />
      )}
    </div>
  );
}

/**
 * The card's footer (Figma `04 — Handoff`): "Add note" attaches a note to
 * this component (it appears on the Notes tab and, for the developer, next
 * to this component on the share view); "Ask about this finding" opens the
 * assistant on this component, or on the selected value if there is one.
 */
function CardFooter({ handoffId, componentId, componentName, selectedRow }: {
  handoffId: string; componentId: string; componentName: string; selectedRow: Row | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isWriting, setIsWriting] = useState(false);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveNote() {
    setIsSaving(true);
    setError(null);
    const result = await addDesignerNote({ handoffId, componentId, content: note });
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setNote('');
    setIsWriting(false);
    toast('Note added');
    router.refresh();
  }

  function ask() {
    const row = selectedRow && selectedRow.findingType !== 'Component' ? selectedRow : null;
    const rowName = row ? `${row.label}${row.findingType === 'ComponentState' ? ' state' : ''}` : null;
    const detail: AskAbout = {
      label: rowName ? `${componentName} · ${rowName}` : componentName,
      suggestions: rowName
        ? [
            `Is the ${componentName} ${rowName.toLowerCase()} confirmed, or still a suggestion?`,
            `What’s still undecided on the ${componentName}?`,
            `What would a developer still need to ask about the ${componentName}?`,
          ]
        : [
            `What’s still undecided on the ${componentName}?`,
            `Which values on the ${componentName} are confirmed so far?`,
            `What would a developer still need to ask about the ${componentName}?`,
          ],
    };
    openAssistant(detail);
  }

  const noteError = note.trim().length === 0 ? 'Write the note first.' : null;

  return (
    <div className="mt-3 border-t border-[--color-border] bg-[--color-background]">
      {isWriting && (
        <div className="flex flex-col gap-2 px-4 pt-3">
          <Textarea
            id={`component-note-${componentId}`}
            label={`Note on ${componentName}`}
            hideLabel
            rows={2}
            autoFocus
            maxLength={2000}
            placeholder={`A note for the developer about the ${componentName}…`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          {error && (
            <p role="alert" className="m-0 flex items-center gap-2 text-[12px] text-[--color-error]">
              <AlertCircle aria-hidden="true" size={12} />
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={isSaving || !!noteError} onClick={() => void saveNote()}>
              {isSaving ? 'Adding…' : 'Add note'}
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={isSaving} onClick={() => { setIsWriting(false); setNote(''); setError(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-4 px-4 py-3">
        {!isWriting && (
          <button type="button" onClick={() => setIsWriting(true)} className="flex items-center gap-2 text-[14px] font-medium leading-5 text-[--color-text-body] hover:text-[--color-text-primary]">
            <StickyNote aria-hidden="true" size={14} className="text-[--color-text-secondary]" />
            Add note
          </button>
        )}
        <button type="button" onClick={ask} className="flex items-center gap-2 text-[14px] font-medium leading-5 text-[--color-text-body] hover:text-[--color-text-primary]">
          <MessageSquare aria-hidden="true" size={14} className="text-[--color-text-secondary]" />
          Ask about this finding
        </button>
      </div>
    </div>
  );
}
