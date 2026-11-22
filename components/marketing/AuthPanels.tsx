import type { ReactNode } from 'react';

import { ArrowDown, Check, Download, Flag, Pencil, X } from '@/components/ui/icons';
import { ProvenanceBadge } from '@/components/ui/ProvenanceBadge';
import { ReviewStatusBadge } from '@/components/ui/ReviewStatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';

/**
 * The right-hand panels on Sign in and Sign up (Figma `02 — Auth`): a dotted
 * canvas on the background colour with cobalt corner brackets around the
 * card. Illustrative and inert, so hidden from assistive tech.
 */
function PanelShell({ children }: { children: ReactNode }) {
  return (
    <aside
      aria-hidden="true"
      className="relative hidden flex-col gap-6 overflow-hidden border-l border-[--color-border] bg-[--color-background] px-14 pt-32 lg:flex"
    >
      <div className="pointer-events-none absolute inset-3 bg-[radial-gradient(circle,var(--color-border)_1.25px,transparent_1.5px)] bg-[length:24px_24px]" />
      <div className="relative flex flex-col gap-6">{children}</div>
    </aside>
  );
}

/** Four 24px cobalt corner brackets just outside the framed content (11px on Sign in, 15px on Sign up). */
function Bracketed({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const corner = wide
    ? 'absolute h-6 w-6 border-[--color-primary] [--o:-15px]'
    : 'absolute h-6 w-6 border-[--color-primary] [--o:-11px]';
  return (
    <div className="relative">
      <span className={`${corner} left-[--o] top-[--o] border-l-2 border-t-2`} />
      <span className={`${corner} right-[--o] top-[--o] border-r-2 border-t-2`} />
      <span className={`${corner} bottom-[--o] left-[--o] border-b-2 border-l-2`} />
      <span className={`${corner} bottom-[--o] right-[--o] border-b-2 border-r-2`} />
      {children}
    </div>
  );
}

const SHARE_ROWS: { property: string; value: string; badge: ReactNode }[] = [
  {
    property: 'Pay button · radius',
    value: '8px',
    badge: <ProvenanceBadge provenance="Detected" />,
  },
  {
    property: 'Card number · focus ring',
    value: '2px primary',
    badge: <ReviewStatusBadge status="Confirmed" />,
  },
  {
    property: 'Pay button · loading',
    value: 'Spinner only',
    badge: <ProvenanceBadge provenance="Suggested" />,
  },
];

/** Sign in: for developers arriving from a shared link. */
export function SharePanel() {
  return (
    <PanelShell>
      <div className="flex flex-col gap-2">
        <span className="text-[20px] font-semibold leading-7 text-[--color-text-primary]">
          Opening a shared handoff?
        </span>
        <span className="text-[16px] leading-6 text-[--color-text-secondary]">
          You don’t need an account. The link the designer sent opens straight in your browser.
        </span>
      </div>

      <span className="flex items-center gap-2 self-start rounded-full border border-[--color-border] bg-white px-3 py-2 text-[12px] font-medium leading-4 text-[--color-text-body]">
        <span className="h-2 w-2 rounded-full bg-[--color-success]" />
        Corner radius marked implemented · just now
      </span>

      <Bracketed>
        <div className="overflow-hidden rounded-[12px] border border-[--color-border] bg-white shadow-[0_20px_40px_-12px_rgba(14,19,32,0.08)]">
          <div className="flex flex-col gap-4 px-5 py-[18px]">
            <div className="flex items-center gap-3">
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[16px] font-semibold leading-6 text-[--color-text-primary]">
                  Ledger · Checkout v3
                </span>
                <span className="text-[12px] leading-4 text-[--color-text-secondary]">
                  Shared by the designer · read-only
                </span>
              </span>
              <span className="flex flex-col items-end gap-0.5">
                <span className="text-[20px] font-semibold leading-7 text-[--color-text-primary]">
                  78%
                </span>
                <span className="text-[12px] font-medium leading-4 text-[--color-error]">
                  Not ready · 1 critical gap open
                </span>
              </span>
            </div>
            <div className="overflow-hidden rounded-[8px] border border-[--color-border]">
              {SHARE_ROWS.map((row, index) => (
                <div
                  key={row.property}
                  className={`flex items-center gap-3 px-3 py-2.5 ${index < SHARE_ROWS.length - 1 ? 'border-b border-[--color-border]' : ''}`}
                >
                  <span className="flex-1 text-[14px] leading-5 text-[--color-text-secondary]">
                    {row.property}
                  </span>
                  <span className="font-mono text-[13px] leading-[18px] text-[--color-text-primary]">
                    {row.value}
                  </span>
                  {row.badge}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2.5 rounded-[8px] border border-[--color-error-light] px-3 py-2.5">
              <SeverityBadge severity="Critical" />
              <span className="text-[14px] leading-5 text-[--color-text-body]">
                No state for a declined card
              </span>
            </div>
          </div>
          <div className="flex items-center gap-5 border-t border-[--color-border] px-5 py-3 text-[14px] font-medium leading-5 text-[--color-primary]">
            <span className="flex items-center gap-1.5">
              <Flag size={14} />
              Flag something unclear
            </span>
            <span className="flex items-center gap-1.5">
              <Download size={14} />
              Download as Markdown
            </span>
          </div>
        </div>
      </Bracketed>

      <span className="pt-1 text-[14px] leading-5 text-[--color-text-secondary]">
        Link not working? Shared links can be revoked or set to expire. Ask the designer for a new
        one.
      </span>
    </PanelShell>
  );
}

/** Sign up: the designer confirms, and the developer sees only what was confirmed. */
export function ProofPanel() {
  return (
    <PanelShell>
      <Bracketed wide>
        <div className="flex flex-col gap-3">
          <span className="text-[14px] font-medium leading-5 text-[--color-text-secondary]">
            Designer view
          </span>
          <div className="flex flex-col gap-3.5 rounded-[12px] border border-[--color-border] bg-white px-5 py-[18px]">
            <div className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-dashed border-[--color-inferred] bg-white text-[12px] font-medium text-[--color-inferred]">
                2
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <span className="text-[14px] font-medium leading-5 text-[--color-text-primary]">
                  Card number · focus ring
                </span>
                <span className="font-mono text-[13px] leading-[18px] text-[--color-text-secondary]">
                  2px primary, offset 2
                </span>
              </span>
              <ProvenanceBadge provenance="Inferred" />
            </div>
            <div className="flex gap-2 pl-9">
              <span className="flex items-center gap-1.5 rounded-[8px] border border-[--color-success] bg-[--color-success-light] px-2.5 py-1.5 text-[14px] font-medium leading-5 text-[--color-success]">
                <Check size={14} />
                Confirm
              </span>
              <span className="flex items-center gap-1.5 rounded-[8px] border border-[--color-border] bg-white px-2.5 py-1.5 text-[14px] font-medium leading-5 text-[--color-text-body]">
                <Pencil size={14} />
                Modify
              </span>
              <span className="flex items-center gap-1.5 rounded-[8px] border border-[--color-border] bg-white px-2.5 py-1.5 text-[14px] font-medium leading-5 text-[--color-text-body]">
                <X size={14} />
                Reject
              </span>
            </div>
          </div>
          <span className="flex items-center gap-1.5 self-start py-1 text-[12px] leading-4 text-[--color-text-secondary]">
            <ArrowDown size={14} />
            Shared
          </span>
          <span className="text-[14px] font-medium leading-5 text-[--color-text-secondary]">
            Developer view
          </span>
          <div className="flex items-center gap-3 rounded-[12px] border border-[--color-border] bg-white px-5 py-3.5">
            <span className="text-[14px] leading-5 text-[--color-text-secondary]">Focus ring</span>
            <span className="flex-1 font-mono text-[13px] leading-[18px] text-[--color-text-primary]">
              2px primary, offset 2
            </span>
            <ReviewStatusBadge status="Confirmed" />
          </div>
        </div>
      </Bracketed>
      <div className="flex flex-col">
        <span className="pt-3 text-[16px] leading-6 text-[--color-text-body]">
          Developers only see what you’ve confirmed.
        </span>
      </div>
    </PanelShell>
  );
}
