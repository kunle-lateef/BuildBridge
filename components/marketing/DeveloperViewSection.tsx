import { MARKETING_CONTAINER } from '@/components/marketing/container';
import { Check, Copy, Flag, StickyNote } from '@/components/ui/icons';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { cn } from '@/lib/cn';
import type { ProvenanceType } from '@/lib/types';

const POINTS: { title: string; description: string; markerClass: string }[] = [
  {
    title: 'Decided first',
    description:
      'Values you confirmed or corrected, each marked with where it came from: Detected, Inferred, Suggested, or Modified by designer.',
    markerClass: 'border-solid',
  },
  {
    title: 'Not decided yet, in its own group',
    description:
      'Anything you haven’t reviewed stays visible but separate, with the note: check with the designer before building it.',
    markerClass: 'border-dashed',
  },
  {
    title: 'Built for how developers work',
    description:
      'Copy a component as a checklist or the whole handoff as Markdown, flag a value that looks wrong, and mark values as implemented.',
    markerClass: 'border-dotted',
  },
];

type ExampleRow = {
  property: string;
  value: string;
  provenance: ProvenanceType;
  note?: string;
  mono?: boolean;
};

const DECIDED_ROWS: ExampleRow[] = [
  { property: 'Corner radius', value: '8px', provenance: 'Detected', note: 'Implemented', mono: true },
  { property: 'Fill', value: '#4F46E5', provenance: 'Detected', mono: true },
  { property: 'Label', value: 'Pay {order total}', provenance: 'Detected', note: 'Modified by designer' },
  { property: 'Focus ring', value: '3px primary, offset 2', provenance: 'Inferred', note: 'Modified by designer', mono: true },
];

const UNDECIDED_ROWS: ExampleRow[] = [
  { property: 'Height', value: '48px', provenance: 'Detected', mono: true },
  { property: 'Hover', value: 'darkens 8%', provenance: 'Inferred', mono: true },
  { property: 'Loading state', value: 'Spinner only', provenance: 'Suggested' },
];

function GroupLabel({ label, count, decided }: { label: string; count: number; decided: boolean }) {
  return (
    <tr>
      <th
        colSpan={3}
        scope="colgroup"
        className="bg-[--color-surface] px-3 py-2 text-left text-[length:var(--font-desktop-caption-medium-size)] font-medium text-[--color-text-primary]"
      >
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              'h-2 w-2 rounded-full border border-[--color-text-primary]',
              decided && 'bg-[--color-text-primary]',
            )}
          />
          {label}
          <span className="text-[--color-text-muted]">{count}</span>
        </span>
      </th>
    </tr>
  );
}

function Row({ row, muted }: { row: ExampleRow; muted?: boolean }) {
  return (
    <tr className="border-t border-[--color-border]">
      <th
        scope="row"
        className={cn(
          'px-3 py-3 text-left font-normal',
          muted ? 'text-[--color-text-muted]' : 'text-[--color-text-secondary]',
        )}
      >
        {row.property}
      </th>
      <td className={cn('px-3 py-3 text-[--color-text-primary]', row.mono && 'font-mono text-[13px]')}>
        {row.value}
      </td>
      <td className="px-3 py-3">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <ProvenanceBadge provenance={row.provenance} />
          {row.note && (
            <span className="inline-flex items-center gap-1 text-[length:var(--font-desktop-caption-medium-size)] text-[--color-text-muted]">
              {row.note === 'Implemented' && <Check aria-hidden="true" size={12} />}
              {row.note}
            </span>
          )}
        </span>
      </td>
    </tr>
  );
}

/**
 * A static, non-interactive picture of the share view (one component,
 * decided vs not-decided groups), so the developer side of the product is
 * shown rather than described. Same data shape and badges as the real share
 * page; nothing here is clickable.
 */
function ShareViewExample() {
  return (
    <figure className="overflow-hidden rounded-[--radius-lg] border border-[--color-border] bg-[--color-background] p-4 sm:p-6">
      <figcaption className="sr-only">
        Example of the developer&apos;s share view for a Pay button, with decided values listed before values
        the designer hasn&apos;t reviewed yet.
      </figcaption>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-[--color-text-primary]">Pay button</span>
          <span className="text-[length:var(--font-desktop-caption-medium-size)] text-[--color-text-muted]">
            Button · Checkout
          </span>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-2 rounded-[--radius-md] bg-[--color-surface] px-3 py-2 text-[length:var(--font-desktop-caption-medium-size)] text-[--color-text-body]">
        <StickyNote aria-hidden="true" size={14} className="mt-0.5 shrink-0 text-[--color-text-muted]" />
        <span>
          <span className="font-medium text-[--color-text-primary]">Note from the designer:</span> the label
          always shows the full total, tax included. Never shorten it to &ldquo;Pay&rdquo;.
        </span>
      </p>

      <div className="mt-3 overflow-x-auto rounded-[--radius-md] border border-[--color-border]">
        <table className="w-full min-w-[440px] text-[length:var(--font-desktop-caption-medium-size)]">
          <thead>
            <tr className="text-left text-[--color-text-muted]">
              <th scope="col" className="px-3 py-2 font-medium">Property</th>
              <th scope="col" className="px-3 py-2 font-medium">Value</th>
              <th scope="col" className="px-3 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            <GroupLabel label="Decided" count={DECIDED_ROWS.length} decided />
            {DECIDED_ROWS.map((row) => (
              <Row key={row.property} row={row} />
            ))}
          </tbody>
          <tbody>
            <GroupLabel label="Not decided yet" count={UNDECIDED_ROWS.length} decided={false} />
            {UNDECIDED_ROWS.map((row) => (
              <Row key={row.property} row={row} muted />
            ))}
          </tbody>
        </table>
      </div>

      {/* Inline, not a floating menu: a popover here would cover the
          provenance badges, which must stay visible (AGENTS.md #2). */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[length:var(--font-desktop-caption-medium-size)] text-[--color-text-muted]">
        <span>On every row:</span>
        <span className="inline-flex items-center gap-2 text-[--color-text-body]">
          <Copy aria-hidden="true" size={13} /> Copy value
        </span>
        <span className="inline-flex items-center gap-2 text-[--color-text-body]">
          <Check aria-hidden="true" size={13} /> Mark as implemented
        </span>
        <span className="inline-flex items-center gap-2 text-[--color-text-body]">
          <Flag aria-hidden="true" size={13} /> Flag this value
        </span>
      </div>
    </figure>
  );
}

export function DeveloperViewSection() {
  return (
    <section id="developer-view" className="scroll-mt-20">
      <div className={cn(MARKETING_CONTAINER, 'flex flex-col gap-10 py-20')}>
        <div className="flex max-w-[720px] flex-col gap-4">
          <h2 className="text-[28px] font-semibold leading-9 tracking-[-0.5px] text-[--color-text-primary] sm:text-[36px] sm:leading-[44px]">
            What your developer opens
          </h2>
          <p className="text-[--color-text-secondary]">
            One read-only link in the browser. No account, no seat. What you decided comes first, and anything
            still open is marked so nobody builds a guess.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-12">
          <ul className="flex flex-col gap-8">
            {POINTS.map((point) => (
              <li
                key={point.title}
                className={cn('flex flex-col gap-2 border-l-2 border-[--color-text-muted] pl-4', point.markerClass)}
              >
                <span className="font-semibold text-[--color-text-primary]">{point.title}</span>
                <p className="text-[--color-text-secondary]">{point.description}</p>
              </li>
            ))}
          </ul>

          <ShareViewExample />
        </div>
      </div>
    </section>
  );
}
