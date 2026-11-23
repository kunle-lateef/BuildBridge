'use client';

import { useEffect, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { useModKey } from '@/components/ui/useModKey';

/**
 * Keyboard shortcuts on the Review tab (Figma `04 — Handoff / Keyboard
 * shortcuts`). J/K move through the findings panel (gaps, component
 * headers, value rows); landing on a closed component opens it, landing on
 * a row selects it. C/M/R press that row's own Confirm/Modify/Reject
 * buttons, so a shortcut records exactly what a click would, nothing more.
 * "?" lists the shortcuts. Ignored while typing or with a modifier held,
 * so ⌘K and text fields keep working.
 */
export function ReviewShortcuts() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const modKey = useModKey();

  useEffect(() => {
    function isTyping(target: EventTarget | null) {
      const element = target as HTMLElement | null;
      return !!element && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName));
    }

    function navItems(): HTMLElement[] {
      return [...document.querySelectorAll<HTMLElement>('[data-findings-panel] [data-review-nav]')].filter(
        (element) => element.offsetParent !== null,
      );
    }

    function move(step: 1 | -1) {
      const items = navItems();
      if (items.length === 0) return;
      const current = items.findIndex((item) => item === document.activeElement || item.contains(document.activeElement));
      const next = items[current === -1 ? (step === 1 ? 0 : items.length - 1) : Math.min(items.length - 1, Math.max(0, current + step))];
      if (!next) return;
      next.focus();
      next.scrollIntoView({ block: 'nearest' });
      // Opening a component or selecting a row is what reveals its values and
      // their Confirm/Modify/Reject; a gap only gets focus (Enter opens it).
      if (next.dataset.reviewNav !== 'gap' && next.getAttribute('aria-expanded') === 'false') next.click();
    }

    function decide(action: 'Confirm' | 'Modify' | 'Reject') {
      const row = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-finding-row]');
      row?.querySelector<HTMLButtonElement>(`[data-decision="${action}"]:not(:disabled)`)?.click();
    }

    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      // An open dialog (a modal, the assistant drawer) owns the keyboard.
      const dialogOpen = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].some(
        (dialog) => !dialog.closest('[aria-hidden="true"], [inert]') && dialog.getClientRects().length > 0,
      );
      if (dialogOpen) return;

      switch (event.key) {
        case 'j': case 'J': event.preventDefault(); move(1); break;
        case 'k': case 'K': event.preventDefault(); move(-1); break;
        case 'c': case 'C': decide('Confirm'); break;
        case 'm': case 'M': event.preventDefault(); decide('Modify'); break;
        case 'r': case 'R': decide('Reject'); break;
        case '?': event.preventDefault(); setIsHelpOpen(true); break;
        default:
      }
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Modal open={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="Keyboard shortcuts">
      <ShortcutGroup
        label="Reviewing"
        rows={[
          ['Next finding', ['J']],
          ['Previous finding', ['K']],
          ['Confirm', ['C']],
          ['Modify', ['M']],
          ['Reject', ['R']],
        ]}
      />
      <ShortcutGroup
        label="Anywhere"
        rows={[
          ['Search handoffs and pages', [modKey, 'K']],
          ['Show these shortcuts', ['?']],
          ['Close a panel or dialog', ['Esc']],
        ]}
      />
    </Modal>
  );
}

function ShortcutGroup({ label, rows }: { label: string; rows: [string, string[]][] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-[--color-text-secondary]">{label}</h3>
      <dl className="m-0 flex flex-col gap-2">
        {rows.map(([action, keys]) => (
          <div key={action} className="flex items-center justify-between gap-4">
            <dt className="text-[14px] leading-5 text-[--color-text-primary]">{action}</dt>
            <dd className="m-0 flex gap-1">
              {keys.map((key) => <Key key={key}>{key}</Key>)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-grid h-6 min-w-6 place-items-center rounded-[4px] border border-[--color-border] bg-white px-1.5 font-sans text-[12px] font-medium leading-4 text-[--color-text-primary]">
      {children}
    </kbd>
  );
}

/** The hint bar at the bottom of the findings panel. */
export function ShortcutHints() {
  const hint = (keys: string[], label: string) => (
    <span className="inline-flex items-center gap-1">
      {keys.map((key) => <Key key={key}>{key}</Key>)}
      <span className="text-[12px] leading-4 text-[--color-text-secondary]">{label}</span>
    </span>
  );
  return (
    <div aria-hidden="true" className="hidden flex-wrap items-center gap-x-3 gap-y-1 border-t border-[--color-border] px-3 py-2 lg:flex">
      {hint(['J', 'K'], 'Move')}
      {hint(['C'], 'Confirm')}
      {hint(['M'], 'Modify')}
      {hint(['R'], 'Reject')}
      <span className="flex-1" />
      {hint(['?'], 'Shortcuts')}
    </div>
  );
}
