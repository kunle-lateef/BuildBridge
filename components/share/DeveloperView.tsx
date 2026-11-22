import type { ReactNode } from 'react';

import { DeveloperFlagForm } from '@/components/handoff/DeveloperFlagForm';
import { EdgeCasesSection } from '@/components/handoff/EdgeCasesSection';
import { ImplementationNotesSection } from '@/components/handoff/ImplementationNotesSection';
import { RecentUpdatesSection } from '@/components/handoff/RecentUpdatesSection';
import { ResponsiveSection } from '@/components/handoff/ResponsiveSection';
import { ScreenPinProvider } from '@/components/handoff/ScreenPinProvider';
import { WhatsChangedBanner } from '@/components/handoff/WhatsChangedBanner';
import { ShareComponentTable, type ShareRow } from '@/components/share/ShareComponentTable';
import { ShareTopBar } from '@/components/share/ShareTopBar';
import type { DeveloperHandoffProjection } from '@/lib/share';

type DeveloperViewProps = {
  projection: DeveloperHandoffProjection;
  /** Present on a live share link; absent in the designer's preview, which turns off marks, flags and "what changed". */
  shareToken?: string;
  downloadHref: string;
  /** Rendered above the top bar, e.g. the preview's "Preview only" notice. */
  notice?: ReactNode;
};

const isDecided = (row: ShareRow) => row.reviewStatus === 'Confirmed' || row.reviewStatus === 'Modified';

/**
 * The developer's documentation of one handoff (Figma `05 — Share view`).
 * Both the share link and the designer's preview render this, so the
 * preview can never show something different from what a developer sees.
 * Only lib/share.ts's projection reaches it.
 */
export function DeveloperView({ projection, shareToken, downloadHref, notice }: DeveloperViewProps) {
  const openIssues = projection.issues.filter((issue) => issue.status === 'Open' || issue.status === 'InReview');
  const criticalOpen = openIssues.filter((issue) => issue.severity === 'Critical').length;
  const screenNameById = new Map(projection.screens.map((screen) => [screen.id, screen.name]));
  const notesByComponent = new Map(
    projection.notes.filter((note) => note.componentId).map((note) => [note.componentId as string, note.content]),
  );
  const generalNotes = projection.notes.filter((note) => !note.componentId);

  const tables = projection.components.map((component) => {
    const rows: ShareRow[] = [
      ...component.specifications.map((spec) => ({
        findingType: 'Specification' as const,
        id: spec.id,
        property: spec.property,
        value: `${spec.value}${spec.unit ?? ''}`,
        isMono: true,
        provenance: spec.provenance,
        reviewStatus: spec.reviewStatus,
        isImplemented: spec.isImplemented,
      })),
      ...component.states.map((state) => ({
        findingType: 'ComponentState' as const,
        id: state.id,
        property: `${state.name} state`,
        value: state.description ?? '',
        isMono: false,
        provenance: state.provenance,
        reviewStatus: state.reviewStatus,
        isImplemented: state.isImplemented,
      })),
    ];
    return { component, rows };
  });

  const decidedRows = tables.flatMap(({ rows }) => rows.filter(isDecided));
  const implementedCount = decidedRows.filter((row) => row.isImplemented).length;
  const checklist = [
    `# ${projection.name}: decided values`,
    '',
    ...tables.flatMap(({ component, rows }) => {
      const decided = rows.filter(isDecided);
      return decided.length === 0
        ? []
        : [`## ${component.name}`, ...decided.map((row) => `- [${row.isImplemented ? 'x' : ' '}] ${row.property}: ${row.value}`), ''];
    }),
  ].join('\n');

  const nav = [
    { href: '#overview', label: 'Overview' },
    { href: '#screens', label: 'Screens', count: projection.screens.length },
    { href: '#components', label: 'Components', count: projection.components.length },
    { href: '#responsive', label: 'Responsive', count: projection.responsiveRules.length },
    { href: '#edge-cases', label: 'Edge cases', count: projection.issues.length },
    { href: '#notes', label: 'Implementation notes', count: generalNotes.length },
    { href: '#updates', label: 'Recent updates', count: projection.recentUpdates.length },
  ].filter((item) => item.count === undefined || item.count > 0);

  return (
    <ScreenPinProvider>
      <div className="min-h-screen bg-white">
        {notice}
        <ShareTopBar shareToken={shareToken} name={projection.name} checklist={checklist} downloadHref={downloadHref} />
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-10 px-5 py-8 lg:grid-cols-[220px_minmax(0,780px)] lg:px-8">
          <nav aria-label="On this handoff" className="hidden lg:block">
            <div className="sticky top-20 flex flex-col gap-0.5">
              <span className="px-3 pb-2 text-[12px] font-medium leading-4 text-[--color-text-secondary]">On this handoff</span>
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-[6px] px-3 py-1.5 text-[14px] leading-5 text-[--color-text-secondary] hover:bg-[--color-surface] hover:text-[--color-text-primary]"
                >
                  {item.label}
                  {item.count !== undefined && <span className="text-[12px] leading-4">{item.count}</span>}
                </a>
              ))}
            </div>
          </nav>

          <main className="flex min-w-0 flex-col gap-10">
            <section id="overview" className="flex scroll-mt-24 flex-col gap-3 border-b border-[--color-border] pb-6">
              <h1 className="m-0 text-[28px] font-semibold leading-9 text-[--color-text-primary]">{projection.name}</h1>
              {projection.description && (
                <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">{projection.description}</p>
              )}
              {shareToken && (
                <WhatsChangedBanner
                  shareToken={shareToken}
                  current={{ readinessScore: projection.readinessScore, issueCount: openIssues.length }}
                />
              )}
              {projection.readinessScore !== null && (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-3 text-[12px] leading-4">
                    <span className="text-[20px] font-semibold leading-7 text-[--color-text-primary]">{projection.readinessScore}%</span>
                    <span className="h-1 w-20 overflow-hidden rounded-full bg-[--color-surface]">
                      <span
                        className={criticalOpen > 0 ? 'block h-full bg-[--color-warning]' : 'block h-full bg-[--color-success]'}
                        style={{ width: `${projection.readinessScore}%` }}
                      />
                    </span>
                    {criticalOpen > 0 ? (
                      <span className="font-medium text-[--color-error]">
                        Not ready · {criticalOpen} critical {criticalOpen === 1 ? 'gap' : 'gaps'} open
                      </span>
                    ) : (
                      <span className="font-medium text-[--color-text-primary]">No critical gaps open</span>
                    )}
                    {decidedRows.length > 0 && (
                      <span className="text-[--color-text-secondary]">
                        · {implementedCount} of {decidedRows.length} decided values implemented
                      </span>
                    )}
                  </div>
                  <p className="m-0 text-[12px] leading-4 text-[--color-text-secondary]">
                    Build what’s under Decided. Check with the designer before building anything under Not decided yet.
                  </p>
                </div>
              )}
            </section>

            {projection.screens.length > 0 && (
              <section id="screens" className="flex scroll-mt-24 flex-col gap-3">
                <h2 className="m-0 text-[20px] font-semibold leading-7 text-[--color-text-primary]">Screens</h2>
                <ol className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-2">
                  {projection.screens.map((screen, index) => {
                    const next = projection.screens[index + 1];
                    const flow = next
                      ? projection.screenFlows.find((candidate) => candidate.sourceScreenName === screen.name && candidate.targetScreenName === next.name)
                      : undefined;
                    return (
                      <li key={screen.id} className="flex shrink-0 items-center gap-2">
                        <figure className="m-0 flex w-[160px] flex-col gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                          <img
                            src={screen.imageUrl}
                            alt={`${screen.name} screen`}
                            className="h-[100px] w-full rounded-[8px] border border-[--color-border] bg-[--color-surface] object-cover object-top"
                          />
                          <figcaption className="text-[12px] leading-4 text-[--color-text-body]">{screen.name}</figcaption>
                        </figure>
                        {next && (
                          <span aria-hidden="true" className="flex w-12 flex-col items-center pb-6 text-[12px] leading-4 text-[--color-text-secondary]">
                            →{flow?.label && <span className="text-center">{flow.label}</span>}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {tables.length > 0 && (
              <section id="components" className="flex scroll-mt-24 flex-col gap-8">
                <h2 className="m-0 text-[20px] font-semibold leading-7 text-[--color-text-primary]">Components</h2>
                {tables.map(({ component, rows }) => (
                  <ShareComponentTable
                    key={component.id}
                    shareToken={shareToken}
                    id={component.id}
                    name={component.name}
                    type={component.type}
                    screenName={component.pinScreenId ? (screenNameById.get(component.pinScreenId) ?? null) : null}
                    note={notesByComponent.get(component.id) ?? null}
                    rows={rows}
                  />
                ))}
              </section>
            )}

            <div id="responsive" className="scroll-mt-24">
              <ResponsiveSection shareToken={shareToken} rules={projection.responsiveRules} />
            </div>
            <div id="edge-cases" className="scroll-mt-24">
              <EdgeCasesSection issues={projection.issues} />
            </div>
            <div id="notes" className="scroll-mt-24">
              <ImplementationNotesSection notes={generalNotes} />
            </div>
            <div id="updates" className="scroll-mt-24">
              <RecentUpdatesSection updates={projection.recentUpdates} />
            </div>
            {shareToken && <DeveloperFlagForm shareToken={shareToken} />}
          </main>
        </div>
      </div>
    </ScreenPinProvider>
  );
}
