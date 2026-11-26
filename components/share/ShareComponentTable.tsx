'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { FlagValuePopover } from '@/components/share/FlagValuePopover';
import { Check, Copy, Flag, MoreHorizontal, StickyNote } from '@/components/ui/icons';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { cn } from '@/lib/cn';
import type { ProvenanceType, ReviewStatus } from '@/lib/types';

export type ShareRow = {
  findingType: 'Specification' | 'ComponentState';
  id: string;
  property: string;
  value: string;
  isMono: boolean;
  provenance: ProvenanceType;
  reviewStatus: ReviewStatus;
  isImplemented: boolean;
};

type ShareComponentTableProps = {
  shareToken?: string;
  id: string;
  name: string;
  type: string;
  screenName: string | null;
  note: string | null;
  rows: ShareRow[];
};

const isDecided = (row: ShareRow) => row.reviewStatus === 'Confirmed' || row.reviewStatus === 'Modified';

/** Phones show this many values per group before "Show N more". */
const PHONE_ROWS = 3;

/**
 * One component on the developer's share view (Figma `05 — Share view`):
 * the designer's note, then a table of values split into Decided and "Not
 * decided yet". Undecided values stay visible but muted, so nobody builds
 * a guess by accident; rejected values never appear. Every value keeps its
 * provenance badge. The ⋯ menu copies a value, marks it implemented, or
 * flags it for the designer.
 */
export function ShareComponentTable({ shareToken, id, name, type, screenName, note, rows }: ShareComponentTableProps) {
  const visible = rows.filter((row) => row.reviewStatus !== 'Rejected');
  const decided = visible.filter(isDecided);
  const open = visible.filter((row) => !isDecided(row));

  return (
    <section id={`component-${id}`} className="flex scroll-mt-24 flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0 flex items-baseline gap-2 text-[16px] font-semibold leading-6 text-[--color-text-primary]">
          {name}
          <span className="text-[12px] font-normal leading-4 text-[--color-text-secondary]">
            {[type, screenName].filter(Boolean).join(' · ')}
          </span>
        </h3>
        <a href="/#trust" target="_blank" rel="noreferrer" className="text-[12px] leading-4 text-[--color-primary] underline">
          What the labels mean
        </a>
      </div>

      {note && (
        <p className="m-0 flex items-start gap-2 rounded-[8px] bg-[--color-surface] px-3 py-2 text-[12px] leading-4 text-[--color-text-body]">
          <StickyNote aria-hidden="true" size={14} className="mt-px shrink-0 text-[--color-text-secondary]" />
          <span>
            <span className="font-medium text-[--color-text-primary]">Note from the designer:</span> {note}
          </span>
        </p>
      )}

      {/* Phones (Figma "Share view — Mobile 390"): each value is two lines, property and value, then its labels. */}
      <div className="overflow-x-auto rounded-[8px] border border-[--color-border] bg-white">
        <table className="w-full border-collapse text-[12px] leading-4 max-sm:block sm:min-w-[520px]">
          <thead className="max-sm:hidden">
            <tr className="bg-[--color-background] text-left text-[--color-text-secondary]">
              <th scope="col" className="px-3 py-2 font-medium">Property</th>
              <th scope="col" className="px-3 py-2 font-medium">Value</th>
              <th scope="col" className="px-3 py-2 font-medium">Source</th>
              <th scope="col" className="w-10 px-2 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <Group label="Decided" rows={decided} isDecided shareToken={shareToken} componentName={name} />
          <Group label="Not decided yet" rows={open} isDecided={false} shareToken={shareToken} componentName={name} />
        </table>
      </div>
    </section>
  );
}

function Group({ label, rows, isDecided: decided, shareToken, componentName }: {
  label: string; rows: ShareRow[]; isDecided: boolean; shareToken?: string; componentName: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  if (rows.length === 0) return null;
  const hiddenOnPhone = isExpanded ? 0 : Math.max(0, rows.length - PHONE_ROWS);
  return (
    <tbody className="max-sm:block">
      <tr className="border-t border-[--color-border] max-sm:block max-sm:[tbody:first-of-type>&]:border-t-0">
        <th colSpan={4} scope="colgroup" className="px-3 pb-1.5 pt-3 text-left font-medium text-[--color-text-primary] max-sm:block max-sm:px-4">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full border border-[--color-text-body]', decided && 'bg-[--color-text-body]')} />
            {label}
            <span className="font-normal text-[--color-text-secondary]">{rows.length}</span>
          </span>
        </th>
      </tr>
      {rows.map((row, index) => (
        <Row
          key={`${row.findingType}:${row.id}`}
          row={row}
          isMuted={!decided}
          shareToken={shareToken}
          componentName={componentName}
          isHiddenOnPhone={index >= rows.length - hiddenOnPhone}
        />
      ))}
      {hiddenOnPhone > 0 && (
        <tr className="block border-t border-[--color-border] sm:hidden">
          <td className="block px-4 py-3">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="text-[14px] font-medium leading-5 text-[--color-primary] underline"
            >
              Show {hiddenOnPhone} more
            </button>
          </td>
        </tr>
      )}
    </tbody>
  );
}

function Row({ row, isMuted, shareToken, componentName, isHiddenOnPhone }: {
  row: ShareRow; isMuted: boolean; shareToken?: string; componentName: string;
  /** Past the first few on phones, until "Show N more". */
  isHiddenOnPhone: boolean;
}) {
  const [isImplemented, setIsImplemented] = useState(row.isImplemented);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLTableCellElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [flagAnchor, setFlagAnchor] = useState<DOMRect | null>(null);
  const closeFlag = useCallback(() => {
    setFlagAnchor(null);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    function onDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isMenuOpen]);

  async function markImplemented() {
    if (!shareToken) return;
    const response = await fetch(`/api/share/${shareToken}/marks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findingType: row.findingType, findingReference: row.id }),
    });
    if (response.ok) setIsImplemented(true);
    setIsMenuOpen(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(row.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked; the value is still on screen to select.
    }
    setIsMenuOpen(false);
  }

  // Opens the "Flag this value" popover (a sheet on phones) under the ⋯.
  function flag() {
    const rect = menuButtonRef.current?.getBoundingClientRect();
    if (rect) setFlagAnchor(rect);
    setIsMenuOpen(false);
  }

  return (
    <tr
      className={cn(
        'group border-t border-[--color-border] hover:bg-[--color-background]',
        // Phones: property | value | ⋯ on one line, the labels under the value.
        'max-sm:grid max-sm:grid-cols-[96px_minmax(0,1fr)_auto] max-sm:gap-x-3 max-sm:gap-y-2 max-sm:px-4 max-sm:py-3',
        isHiddenOnPhone && 'max-sm:hidden',
      )}
    >
      <th scope="row" className={cn('px-3 py-2.5 text-left text-[14px] font-normal leading-5 max-sm:p-0', isMuted ? 'text-[--color-text-muted]' : 'text-[--color-text-secondary]')}>
        {row.property}
      </th>
      <td className={cn('px-3 py-2.5 max-sm:min-w-0 max-sm:break-words max-sm:p-0', row.isMono ? 'font-mono text-[13px] leading-[18px]' : 'text-[14px] leading-5', isMuted ? 'text-[--color-text-muted]' : 'text-[--color-text-primary]')}>
        {row.value || '—'}
        {copied && <span className="ml-2 font-sans text-[12px] text-[--color-text-secondary]">Copied</span>}
      </td>
      <td className="px-3 py-2.5 max-sm:col-start-2 max-sm:col-end-4 max-sm:row-start-2 max-sm:p-0">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <ProvenanceBadge provenance={row.provenance} />
          {isImplemented ? (
            <span className="inline-flex items-center gap-1 text-[--color-text-secondary]">
              <Check aria-hidden="true" size={12} /> Implemented
            </span>
          ) : (
            row.reviewStatus === 'Modified' && <span className="text-[--color-text-secondary]">Modified by designer</span>
          )}
        </span>
      </td>
      <td ref={menuRef} className="relative px-2 py-2.5 text-right max-sm:col-start-3 max-sm:row-start-1 max-sm:p-0">
        {flagAnchor && shareToken && (
          <FlagValuePopover
            shareToken={shareToken}
            label={`${componentName} · ${row.property}`}
            value={row.value}
            isMono={row.isMono}
            findingType={row.findingType}
            findingReference={row.id}
            anchor={flagAnchor}
            onClose={closeFlag}
          />
        )}
        <button
          ref={menuButtonRef}
          type="button"
          aria-label={`Actions for ${row.property}`}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
          className="grid h-6 w-6 place-items-center rounded-[6px] text-[--color-text-secondary] opacity-0 hover:bg-[--color-surface] focus-visible:opacity-100 group-hover:opacity-100 aria-expanded:opacity-100 max-sm:opacity-100"
        >
          <MoreHorizontal aria-hidden="true" size={16} />
        </button>
        {isMenuOpen && (
          <div role="menu" className="absolute right-2 top-full z-20 mt-1 flex w-52 flex-col gap-0.5 rounded-[8px] border border-[--color-border] bg-white p-1 text-left text-[14px] leading-5 shadow-lg">
            <MenuItem icon={<Copy size={14} />} onClick={() => void copy()}>Copy value</MenuItem>
            {shareToken && !isImplemented && (
              <MenuItem icon={<Check size={14} />} onClick={() => void markImplemented()}>Mark as implemented</MenuItem>
            )}
            {shareToken && <MenuItem icon={<Flag size={14} />} onClick={flag}>Flag this value</MenuItem>}
          </div>
        )}
      </td>
    </tr>
  );
}

function MenuItem({ icon, onClick, children }: { icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-[--color-text-body] hover:bg-[--color-surface]">
      <span aria-hidden="true" className="text-[--color-text-secondary]">{icon}</span>
      {children}
    </button>
  );
}
