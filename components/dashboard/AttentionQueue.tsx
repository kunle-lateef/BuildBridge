import Link from 'next/link';

import { CheckCircle2, Flag } from '@/components/ui/icons';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { formatRelativeTime } from '@/lib/relativeTime';

export type AttentionItem =
  | { kind: 'CriticalIssue'; id: string; title: string; handoffId: string; handoffName: string; createdAt: string }
  | {
      kind: 'DeveloperFlag';
      flagKind: 'Mismatch' | 'Question';
      id: string;
      title: string;
      handoffId: string;
      handoffName: string;
      createdAt: string;
    };

type AttentionQueueProps = {
  items: AttentionItem[];
};

/**
 * "Needs your attention" (Figma `03 — Dashboard`, right rail): open
 * Critical gaps and open developer flags across every handoff, newest
 * first. Each item deep-links to the finding on its handoff.
 */
export function AttentionQueue({ items }: AttentionQueueProps) {
  return (
    <section className="overflow-hidden rounded-[12px] border border-[--color-border] bg-white">
      <h2 className="m-0 flex items-center gap-2 border-b border-[--color-border] px-4 py-4 text-[14px] font-medium leading-5 text-[--color-text-primary]">
        Needs your attention
        {items.length > 0 && (
          <span className="rounded-[4px] bg-[--color-error-light] px-2 py-px text-[12px] font-medium leading-4 text-[--color-error]">
            {items.length}
          </span>
        )}
      </h2>

      {items.length === 0 ? (
        <p className="m-0 flex gap-2 px-4 py-3 text-[14px] leading-5 text-[--color-text-secondary]">
          <CheckCircle2 aria-hidden="true" size={14} className="mt-[3px] shrink-0" />
          Nothing needs your attention yet. Critical gaps and developer flags will show up here.
        </p>
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((item, index) => (
            <li
              key={`${item.kind}-${item.id}`}
              className={`relative flex flex-col gap-1.5 px-4 py-3 hover:bg-[--color-background] ${
                index < items.length - 1 ? 'border-b border-[--color-border]' : ''
              }`}
            >
              <span className="flex items-center gap-2 text-[12px] leading-4 text-[--color-text-secondary]">
                {item.kind === 'CriticalIssue' ? (
                  <SeverityBadge severity="Critical" />
                ) : (
                  <span className="inline-flex h-5 items-center gap-1.5 rounded-[4px] bg-[--color-surface] px-2 font-medium text-[--color-text-secondary]">
                    <Flag aria-hidden="true" size={12} />
                    {item.flagKind}
                  </span>
                )}
                {formatRelativeTime(item.createdAt)}
              </span>
              <Link
                href={
                  item.kind === 'CriticalIssue'
                    ? `/handoffs/${item.handoffId}#issue-${item.id}`
                    : `/handoffs/${item.handoffId}#flag-${item.id}`
                }
                className="text-[14px] font-medium leading-5 text-[--color-text-primary] after:absolute after:inset-0"
              >
                {item.title}
              </Link>
              <span className="text-[12px] leading-4 text-[--color-text-secondary]">{item.handoffName}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
