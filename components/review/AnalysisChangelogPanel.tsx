'use client';

import { useState } from 'react';

import { ChevronRight } from '@/components/ui/icons';
import type { ChangelogEntry, ChangelogIssueRef } from '@/lib/changelog';
import { cn } from '@/lib/cn';

export type ConflictContext = { decision: string; decidedAt: string };

type AnalysisChangelogPanelProps = {
  entries: ChangelogEntry[];
  /** For each conflicting gap: what the designer had decided and when. */
  conflictContext: Record<string, ConflictContext>;
};

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

function runTime(date: Date): string {
  const now = new Date();
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const sameDay = date.toDateString() === now.toDateString();
  return `${sameDay ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
}

/**
 * Figma `04 — Handoff / History tab`: one card per analysis run, newest open.
 * Honestly scoped to gap detection, the only stage that runs again on every
 * re-analysis (lib/changelog.ts). Conflicts lead as "Needs your call": a
 * re-analysis never overwrites a designer's decision, it brings it back.
 */
export function AnalysisChangelogPanel({ entries, conflictContext }: AnalysisChangelogPanelProps) {
  const oldestId = entries[entries.length - 1]?.analysisRunId;

  return (
    <div className="flex max-w-[760px] flex-col gap-3">
      {entries.map((entry, index) => (
        <RunCard
          key={entry.analysisRunId}
          entry={entry}
          isFirst={entry.analysisRunId === oldestId}
          defaultOpen={index === 0}
          conflictContext={conflictContext}
        />
      ))}
    </div>
  );
}

function RunCard({ entry, isFirst, defaultOpen, conflictContext }: {
  entry: ChangelogEntry; isFirst: boolean; defaultOpen: boolean; conflictContext: Record<string, ConflictContext>;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const runDate = new Date(entry.runDate);
  const summary = isFirst
    ? `${plural(entry.created.length, 'gap')} found`
    : `${entry.created.length} new · ${entry.reaffirmed.length} still flagged · ${plural(entry.conflicts.length, 'conflict')}`;

  return (
    <section className="rounded-[12px] border border-[--color-border] bg-white">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-4 text-left"
      >
        <ChevronRight aria-hidden="true" size={14} className={cn('shrink-0 text-[--color-text-secondary] transition-transform', isOpen && 'rotate-90')} />
        <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">
          {isFirst ? 'First analysis' : 'Re-analysis'} · {runTime(runDate)}
        </span>
        <span className="ml-auto text-[12px] leading-4 text-[--color-text-secondary]">{summary}</span>
      </button>
      {isOpen && (
        <div className="flex flex-col gap-4 px-4 pb-4 pl-[42px]">
          {entry.conflicts.length > 0 && (
            <Group label="Needs your call">
              {entry.conflicts.map((ref) => {
                const context = conflictContext[ref.issueId];
                return (
                  <Item key={ref.issueId} issue={ref}>
                    {context && (
                      <span className="text-[--color-text-secondary]">
                        {' '}· you marked “{context.decision}” on {new Date(context.decidedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </Item>
                );
              })}
            </Group>
          )}
          {entry.created.length > 0 && (
            <Group label={isFirst ? 'Found' : 'New'}>
              {entry.created.map((ref) => <Item key={ref.issueId} issue={ref} />)}
            </Group>
          )}
          {entry.reaffirmed.length > 0 && (
            <Group label="Still flagged">
              {entry.reaffirmed.map((ref) => <Item key={ref.issueId} issue={ref} />)}
            </Group>
          )}
        </div>
      )}
    </section>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="m-0 text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-[--color-text-secondary]">{label}</h3>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">{children}</ul>
    </div>
  );
}

function Item({ issue, children }: { issue: ChangelogIssueRef; children?: React.ReactNode }) {
  return (
    <li className="text-[14px] leading-5 text-[--color-text-primary]">
      <a href={`?tab=review#issue-${issue.issueId}`} className="hover:underline">{issue.title}</a>
      {children}
    </li>
  );
}
