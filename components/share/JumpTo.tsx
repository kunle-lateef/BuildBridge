'use client';

import { ArrowDown } from '@/components/ui/icons';

export type JumpTarget = { href: string; label: string };

/**
 * "Jump to" (Figma "Share view — Mobile 390"): the "On this handoff" nav as
 * one menu, for widths where the side nav is hidden. A native select, so the
 * phone's own picker opens.
 */
export function JumpTo({ targets }: { targets: JumpTarget[] }) {
  if (targets.length === 0) return null;

  return (
    <label className="relative flex items-center gap-2 rounded-[8px] border border-[--color-border] bg-white px-3 py-3 lg:hidden">
      <span className="shrink-0 text-[12px] font-medium leading-4 tracking-[0.2px] text-[--color-text-secondary]">Jump to</span>
      <select
        defaultValue=""
        onChange={(event) => {
          const target = document.querySelector(event.target.value);
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          event.target.value = '';
        }}
        className="min-w-0 flex-1 appearance-none truncate border-0 bg-transparent p-0 pr-6 text-[14px] font-medium leading-5 text-[--color-text-primary] shadow-none outline-none focus:border-0 focus:shadow-none"
      >
        <option value="" disabled>
          Choose a section
        </option>
        {targets.map((target) => (
          <option key={target.href} value={target.href}>
            {target.label}
          </option>
        ))}
      </select>
      <ArrowDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3 text-[--color-text-secondary]" />
    </label>
  );
}
