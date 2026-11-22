import { cn } from '@/lib/cn';

/**
 * `loading.tsx` fallbacks for dashboard routes (Figma `11 — System /
 * Loading`). Skeletons in the shape of the page, so nothing jumps when the
 * real content arrives. Static labels (page title, tabs) render as text;
 * everything data-driven is a grey bar. Pulses only when motion is allowed.
 */
function Bar({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('block h-2 rounded-full bg-[--color-surface] motion-safe:animate-pulse', className)} />;
}

function Loading({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

function ListCard({ rows, columns, className }: { rows: number; columns: string[]; className?: string }) {
  return (
    <div className={cn('flex flex-col rounded-[12px] border border-[--color-border] bg-white pb-16', className)}>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-6 border-b border-[--color-border] px-4 py-[18px] last:border-b-0">
          {columns.map((width, column) => (
            <Bar key={column} className={width} />
          ))}
        </div>
      ))}
    </div>
  );
}

function RailCard({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col rounded-[12px] border border-[--color-border] bg-white pb-20">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex flex-col gap-2 border-b border-[--color-border] px-4 py-4 last:border-b-0">
          <Bar className="w-[200px]" />
          <Bar className="w-[120px]" />
        </div>
      ))}
    </div>
  );
}

/** Handoffs list: real title, a table and the activity rail as bars. */
export function HandoffsLoading() {
  return (
    <Loading>
      <div className="flex flex-col gap-6">
        <h1 className="m-0 text-[28px] font-semibold leading-9 text-[--color-text-primary]">Handoffs</h1>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ListCard rows={4} columns={['w-[220px]', 'w-[90px]', 'w-[80px]', 'w-[60px]', 'w-[60px]', 'w-[70px]']} />
          <RailCard rows={4} />
        </div>
      </div>
    </Loading>
  );
}

const HANDOFF_TABS = ['Review', 'Screens', 'Responsive', 'Developer feedback', 'History', 'Notes'];

/** One handoff: header bars, the real tab row, a canvas block and the findings panel. */
export function HandoffLoading() {
  return (
    <Loading>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <Bar className="h-7 w-[280px] rounded-[6px]" />
          <Bar className="h-3 w-[240px]" />
        </div>
        <div aria-hidden="true" className="flex gap-6 border-b border-[--color-border] pt-2">
          {HANDOFF_TABS.map((tab, index) => (
            <span
              key={tab}
              className={cn(
                '-mb-px border-b-2 pb-3 text-[14px] leading-5',
                index === 0 ? 'border-[--color-primary] font-medium text-[--color-text-primary]' : 'border-transparent text-[--color-text-secondary]',
              )}
            >
              {tab}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <span aria-hidden="true" className="block h-[480px] rounded-[12px] bg-[--color-surface] motion-safe:animate-pulse lg:h-[calc(100vh-200px)]" />
          <RailCard rows={7} />
        </div>
      </div>
    </Loading>
  );
}

/** Any other dashboard page: its real title, then one card of bars. */
export function PageLoading({ title }: { title: string }) {
  return (
    <Loading>
      <div className="flex flex-col gap-6">
        <h1 className="m-0 text-[28px] font-semibold leading-9 text-[--color-text-primary]">{title}</h1>
        <ListCard rows={5} columns={['w-[200px]', 'w-[160px]', 'w-[80px]']} className="max-w-[880px]" />
      </div>
    </Loading>
  );
}
