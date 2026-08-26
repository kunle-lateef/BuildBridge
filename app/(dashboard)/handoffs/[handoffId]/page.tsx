import {
  AlertTriangle,
  Boxes,
  History,
  Image as ImageIcon,
  MessageSquareWarning,
  Share2,
  Smartphone,
  StickyNote,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { HandoffActionsMenu } from '@/components/handoff/HandoffActionsMenu';
import { HandoffSectionNav } from '@/components/handoff/HandoffSectionNav';
import { ScreenFlowList } from '@/components/handoff/ScreenFlowList';
import { ScreenPinProvider } from '@/components/handoff/ScreenPinProvider';
import { ScreenThumbnail } from '@/components/handoff/ScreenThumbnail';
import { ShareLinkPanel } from '@/components/handoff/ShareLinkPanel';
import { StartAnalysisButton } from '@/components/handoff/StartAnalysisButton';
import { UploadDropzone } from '@/components/handoff/UploadDropzone';
import { AnalysisChangelogPanel } from '@/components/review/AnalysisChangelogPanel';
import {
  AnalysisProgressPanel,
  type StageProgress,
} from '@/components/review/AnalysisProgressPanel';
import { AskBuildBridgeFab } from '@/components/review/AskBuildBridgeFab';
import { BulkDecisionBar } from '@/components/review/BulkDecisionBar';
import { ComponentsList } from '@/components/review/ComponentsList';
import { DesignerNoteThread } from '@/components/review/DesignerNoteThread';
import { DeveloperFlagPanel, type DeveloperFlagItem } from '@/components/review/DeveloperFlagPanel';
import { IssuePanel, type HandoffIssueItem } from '@/components/review/IssuePanel';
import { ReadinessScoreDisplay } from '@/components/review/ReadinessScoreDisplay';
import { ResponsiveRuleList } from '@/components/review/ResponsiveRuleList';
import { buttonVariants } from '@/components/ui/Button';
import { HandoffStatusBadge } from '@/components/ui/HandoffStatusBadge';
import { getAnalysisChangelog } from '@/lib/changelog';
import { db } from '@/lib/db';
import { rankNextBestActions } from '@/lib/readiness';
import { buildScreenPins } from '@/lib/screenPins';
import { createSignedReadUrl } from '@/lib/storage';
import type { AnalysisRunStatus, ProvenanceType } from '@/lib/types';

import { getOwnedHandoffOrNull } from './actions';

type HandoffDetailPageProps = {
  params: Promise<{ handoffId: string }>;
};

export async function generateMetadata({ params }: HandoffDetailPageProps): Promise<Metadata> {
  const { handoffId } = await params;
  const handoff = await getOwnedHandoffOrNull(handoffId);
  return { title: handoff ? `${handoff.name} — BuildBridge` : 'BuildBridge' };
}

function splitByProvenance(items: { provenance: ProvenanceType }[]) {
  return {
    detected: items.filter((item) => item.provenance === 'Detected').length,
    inferred: items.filter((item) => item.provenance === 'Inferred').length,
    suggested: items.filter((item) => item.provenance === 'Suggested').length,
  };
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

async function buildStageProgress(handoffId: string, runStatus: AnalysisRunStatus | undefined) {
  const [components, specifications, states, responsiveRules, issues] = await Promise.all([
    db.component.findMany({ where: { handoffId }, select: { provenance: true } }),
    db.specification.findMany({
      where: { component: { handoffId } },
      select: { provenance: true },
    }),
    db.componentState.findMany({
      where: { component: { handoffId } },
      select: { provenance: true },
    }),
    db.responsiveRule.findMany({ where: { screen: { handoffId } }, select: { provenance: true } }),
    db.handoffIssue.findMany({ where: { handoffId }, select: { provenance: true } }),
  ]);

  const isTerminal =
    runStatus === 'Completed' || runStatus === 'PartiallyCompleted' || runStatus === 'Failed';

  const stageDefinitions = [
    {
      key: 'component_detection',
      label: 'Component detection',
      items: components,
      countLabel: pluralize(components.length, 'component') + ' detected',
    },
    {
      key: 'specification_extraction',
      label: 'Specification extraction',
      items: specifications,
      countLabel: pluralize(specifications.length, 'specification') + ' extracted',
    },
    {
      key: 'state_analysis',
      label: 'State & interaction analysis',
      items: states,
      countLabel: pluralize(states.length, 'interaction state') + ' identified',
    },
    {
      key: 'responsive_analysis',
      label: 'Responsive analysis',
      items: responsiveRules,
      countLabel: pluralize(responsiveRules.length, 'responsive rule') + ' identified',
    },
    {
      key: 'gap_detection',
      label: 'Gap detection',
      items: issues,
      countLabel: pluralize(issues.length, 'issue') + ' found',
    },
  ];

  let runningAssigned = false;

  const stages: StageProgress[] = stageDefinitions.map((definition) => {
    // A terminal run with zero items for this stage only counts as "done"
    // when the run fully Completed — a legitimate zero-result stage looks
    // identical to a failed one otherwise, so PartiallyCompleted/Failed runs
    // must not claim a stage succeeded just because the run is over. See
    // AnalysisProgressPanel's partial-completion messaging.
    const done = definition.items.length > 0 || runStatus === 'Completed';
    let status: StageProgress['status'];

    if (done) {
      status = 'done';
    } else if (!runningAssigned && runStatus === 'Processing') {
      status = 'running';
      runningAssigned = true;
    } else if (isTerminal) {
      status = 'incomplete';
    } else {
      status = 'pending';
    }

    return {
      key: definition.key,
      label: definition.label,
      status,
      countLabel: definition.countLabel,
      provenanceSplit: status === 'done' ? splitByProvenance(definition.items) : undefined,
    };
  });

  return stages;
}

export default async function HandoffDetailPage({ params }: HandoffDetailPageProps) {
  const { handoffId } = await params;
  const handoff = await getOwnedHandoffOrNull(handoffId);

  if (!handoff) {
    notFound();
  }

  const [screens, latestRun, components, issues, unresolvedCriticalCount, shareLinks] =
    await Promise.all([
      db.screen.findMany({
        where: { handoffId },
        include: { asset: true },
        orderBy: { order: 'asc' },
      }),
      db.analysisRun.findFirst({ where: { handoffId }, orderBy: { createdAt: 'desc' } }),
      db.component.findMany({
        where: { handoffId },
        include: { specifications: true, states: true, instances: true },
        orderBy: { createdAt: 'asc' },
      }),
      db.handoffIssue.findMany({ where: { handoffId }, orderBy: { createdAt: 'asc' } }),
      // A lightweight count for the hard-gate display, not a full readiness
      // recompute — the score itself stays cached per architecture.md's
      // Readiness Score section, recalculated only when a decision or
      // analysis run actually changes it.
      db.handoffIssue.count({
        where: { handoffId, severity: 'Critical', status: { in: ['Open', 'InReview'] } },
      }),
      // tokenReference (a hash, but still a secret-adjacent value) is
      // deliberately not selected — the designer UI only ever needs status/
      // dates, never anything that could reconstruct or verify a token.
      db.shareLink.findMany({
        where: { handoffId },
        select: { id: true, status: true, createdAt: true, expiresAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

  const processedScreens = screens.filter(
    (screen) => screen.asset.processingStatus === 'Processed',
  );

  // None of these six depend on one another — previously each was awaited
  // one at a time, turning every page load into a waterfall of round trips
  // instead of one round-trip's worth of wall-clock time.
  const [notes, screenFlows, changelogEntries, developerFlags, implementationMarks, screenThumbnails, stages, responsiveRules] =
    await Promise.all([
      db.designerNote.findMany({
        where: { handoffId },
        orderBy: { createdAt: 'desc' },
      }),
      db.screenFlow.findMany({
        where: { handoffId },
        include: { sourceScreen: true, targetScreen: true },
        orderBy: { createdAt: 'asc' },
      }),
      getAnalysisChangelog(handoffId),
      db.developerFlag.findMany({
        where: { handoffId },
        orderBy: { createdAt: 'desc' },
      }),
      db.implementationMark.findMany({
        where: { handoffId },
        select: { findingType: true, findingReference: true },
      }),
      Promise.all(
        processedScreens.map(async (screen) => ({
          screen,
          imageUrl: await createSignedReadUrl(screen.asset.storageReference),
        })),
      ),
      latestRun ? buildStageProgress(handoffId, latestRun.status) : Promise.resolve(null),
      db.responsiveRule.findMany({
        where: { screen: { handoffId } },
        include: { screen: true },
      }),
    ]);

  const markedKeys = new Set(
    implementationMarks.map((mark) => `${mark.findingType}:${mark.findingReference}`),
  );
  const isImplemented = (findingType: string, findingReference: string) =>
    markedKeys.has(`${findingType}:${findingReference}`);

  const allSpecifications = components.flatMap((component) => component.specifications);
  const allStates = components.flatMap((component) => component.states);

  const nextBestActions = rankNextBestActions(issues);
  const deltaById = Object.fromEntries(
    nextBestActions.map((action) => [action.issueId, action.delta]),
  );
  const topAction = nextBestActions[0] ?? null;

  // See lib/screenPins.ts — the region data this derives from is already
  // fully persisted (ComponentInstance.dimensions), so this is pure
  // in-memory computation, no extra query, no AI pipeline involvement.
  const { pinsByScreen, pinScreenIdByComponentId } = buildScreenPins({
    components,
    responsiveRules,
    issues,
    screens: screens.map((screen) => ({ id: screen.id, order: screen.order })),
  });
  const pinKeyFor = (componentId: string) => `component:${componentId}` as const;

  // Mirrors the same conditionals each section below already renders under —
  // never lists a section the page didn't actually render.
  const sectionNavItems = [
    { id: 'screens', label: 'Screens' },
    processedScreens.length > 0 && { id: 'analysis', label: 'Analysis' },
    components.length > 0 && { id: 'components', label: 'Components' },
    responsiveRules.length > 0 && { id: 'responsive', label: 'Responsive' },
    issues.length > 0 && { id: 'issues', label: 'Issues' },
    changelogEntries.length > 0 && { id: 'history', label: 'History' },
    developerFlags.length > 0 && { id: 'developer-feedback', label: 'Developer feedback' },
    { id: 'notes', label: 'Notes' },
    components.length > 0 && { id: 'share', label: 'Share' },
  ].filter((item): item is { id: string; label: string } => Boolean(item));

  return (
    <ScreenPinProvider>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
              {handoff.name}
            </h1>
            {components.length > 0 && (
              <Link
                href={`/handoffs/${handoff.id}/preview`}
                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
              >
                Preview documentation
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <HandoffStatusBadge status={handoff.status} />
            <HandoffActionsMenu handoffId={handoff.id} isArchived={handoff.status === 'Archived'} />
          </div>
          {handoff.readinessScore !== null && handoff.readinessAlgorithmVersion !== null && (
            <ReadinessScoreDisplay
              score={handoff.readinessScore}
              hasUnresolvedCritical={unresolvedCriticalCount > 0}
              unresolvedCriticalCount={unresolvedCriticalCount}
              algorithmVersion={handoff.readinessAlgorithmVersion}
              topAction={topAction}
            />
          )}
          {components.length > 0 && (
            <p className="text-[--color-text-secondary]">
              This is where you edit the documentation before sharing it — confirm, modify, reject,
              or override any finding below.
            </p>
          )}
        </div>

        <HandoffSectionNav sections={sectionNavItems} />

        <section id="screens" className="flex flex-col gap-3 scroll-mt-32">
          <h2 className="flex items-center gap-2 text-[--color-text-primary]">
            <ImageIcon aria-hidden="true" size={18} className="text-[--color-text-secondary]" />
            Screens
          </h2>
          <UploadDropzone handoffId={handoff.id} />

          {screenThumbnails.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {screenThumbnails.map(({ screen, imageUrl }) => (
                <ScreenThumbnail
                  key={screen.id}
                  screenId={screen.id}
                  name={screen.name}
                  imageUrl={imageUrl}
                  analysisStatus={screen.analysisStatus}
                  pins={pinsByScreen.get(screen.id) ?? []}
                />
              ))}
            </div>
          )}

          <ScreenFlowList
            handoffId={handoff.id}
            screens={processedScreens.map((screen) => ({ id: screen.id, name: screen.name }))}
            flows={screenFlows.map((flow) => ({
              id: flow.id,
              sourceScreenName: flow.sourceScreen.name,
              targetScreenName: flow.targetScreen.name,
              label: flow.label,
            }))}
          />
        </section>

        {processedScreens.length > 0 && (
          <section id="analysis" className="flex flex-col gap-3 scroll-mt-32">
            <h2 className="flex items-center gap-2 text-[--color-text-primary]">
              <Zap aria-hidden="true" size={18} className="text-[--color-primary]" />
              Analysis
            </h2>
            <StartAnalysisButton handoffId={handoff.id} />
            {latestRun && stages && (
              <AnalysisProgressPanel runStatus={latestRun.status} stages={stages} />
            )}
          </section>
        )}

        {components.length > 0 && (
          <section id="components" className="flex flex-col gap-3 scroll-mt-32">
            <h2 className="flex items-center gap-2 text-[--color-text-primary]">
              <Boxes aria-hidden="true" size={18} className="text-[--color-detected]" />
              Components
            </h2>
            {(['Detected', 'Inferred', 'Suggested'] as ProvenanceType[]).map((provenance) => {
              const group = components.filter(
                (component) =>
                  component.provenance === provenance && component.reviewStatus === 'Unreviewed',
              );
              if (group.length < 2) return null;

              return (
                <BulkDecisionBar
                  key={provenance}
                  handoffId={handoff.id}
                  findingType="Component"
                  provenance={provenance}
                  findingReferences={group.map((component) => component.id)}
                  label="component"
                />
              );
            })}
            {/* Specifications and states are nested per-component below, but
              a designer reviewing e.g. 40 Detected specs across 10
              components benefits from acting on all of them at once rather
              than component-by-component — so these bulk bars operate on
              the flattened set across every component in the handoff. */}
            {(['Detected', 'Inferred', 'Suggested'] as ProvenanceType[]).map((provenance) => {
              const group = allSpecifications.filter(
                (spec) => spec.provenance === provenance && spec.reviewStatus === 'Unreviewed',
              );
              if (group.length < 2) return null;

              return (
                <BulkDecisionBar
                  key={`spec-${provenance}`}
                  handoffId={handoff.id}
                  findingType="Specification"
                  provenance={provenance}
                  findingReferences={group.map((spec) => spec.id)}
                  label="specification"
                />
              );
            })}
            {(['Detected', 'Inferred', 'Suggested'] as ProvenanceType[]).map((provenance) => {
              const group = allStates.filter(
                (state) => state.provenance === provenance && state.reviewStatus === 'Unreviewed',
              );
              if (group.length < 2) return null;

              return (
                <BulkDecisionBar
                  key={`state-${provenance}`}
                  handoffId={handoff.id}
                  findingType="ComponentState"
                  provenance={provenance}
                  findingReferences={group.map((state) => state.id)}
                  label="state"
                />
              );
            })}
            <ComponentsList
              components={components.map((component) => ({
                id: component.id,
                name: component.name,
                type: component.type,
                description: component.description,
                provenance: component.provenance,
                reviewStatus: component.reviewStatus,
                isImplemented: isImplemented('Component', component.id),
                specifications: component.specifications.map((spec) => ({
                  ...spec,
                  isImplemented: isImplemented('Specification', spec.id),
                })),
                states: component.states.map((state) => ({
                  ...state,
                  isImplemented: isImplemented('ComponentState', state.id),
                })),
                pinScreenId: pinScreenIdByComponentId.get(component.id) ?? null,
              }))}
            />
          </section>
        )}

        {responsiveRules.length > 0 && (
          <section id="responsive" className="flex flex-col gap-3 scroll-mt-32">
            <h2 className="flex items-center gap-2 text-[--color-text-primary]">
              <Smartphone aria-hidden="true" size={18} className="text-[--color-inferred]" />
              Responsive behavior
            </h2>
            {(['Detected', 'Inferred', 'Suggested'] as ProvenanceType[]).map((provenance) => {
              const group = responsiveRules.filter(
                (rule) => rule.provenance === provenance && rule.reviewStatus === 'Unreviewed',
              );
              if (group.length < 2) return null;

              return (
                <BulkDecisionBar
                  key={`responsive-${provenance}`}
                  handoffId={handoff.id}
                  findingType="ResponsiveRule"
                  provenance={provenance}
                  findingReferences={group.map((rule) => rule.id)}
                  label="responsive rule"
                />
              );
            })}
            <ResponsiveRuleList
              rules={responsiveRules.map((rule) => ({
                ...rule,
                isImplemented: isImplemented('ResponsiveRule', rule.id),
                pinScreenId: rule.componentId
                  ? (pinScreenIdByComponentId.get(rule.componentId) ?? null)
                  : null,
                pinKey: rule.componentId ? pinKeyFor(rule.componentId) : undefined,
              }))}
            />
          </section>
        )}

        {issues.length > 0 && (
          <section id="issues" className="flex flex-col gap-3 scroll-mt-32">
            <h2 className="flex items-center gap-2 text-[--color-text-primary]">
              <AlertTriangle aria-hidden="true" size={18} className="text-[--color-warning]" />
              Issues
            </h2>
            <IssuePanel
              handoffId={handoff.id}
              issues={issues.map((issue): HandoffIssueItem => ({
                ...issue,
                pinScreenId: issue.componentId
                  ? (pinScreenIdByComponentId.get(issue.componentId) ?? null)
                  : null,
                pinKey: issue.componentId ? pinKeyFor(issue.componentId) : undefined,
              }))}
              deltaById={deltaById}
            />
          </section>
        )}

        {changelogEntries.length > 0 && (
          <section id="history" className="flex flex-col gap-3 scroll-mt-32">
            <h2 className="flex items-center gap-2 text-[--color-text-primary]">
              <History aria-hidden="true" size={18} className="text-[--color-text-secondary]" />
              Re-analysis history
            </h2>
            <AnalysisChangelogPanel entries={changelogEntries} />
          </section>
        )}

        {developerFlags.length > 0 && (
          <section id="developer-feedback" className="flex flex-col gap-3 scroll-mt-32">
            <h2 className="flex items-center gap-2 text-[--color-text-primary]">
              <MessageSquareWarning
                aria-hidden="true"
                size={18}
                className="text-[--color-primary]"
              />
              Developer feedback
            </h2>
            <DeveloperFlagPanel
              flags={developerFlags.map((flag): DeveloperFlagItem => ({
                id: flag.id,
                kind: flag.kind,
                message: flag.message,
                submittedByName: flag.submittedByName,
                status: flag.status,
                createdAt: flag.createdAt.toISOString(),
                findingReference: flag.findingReference,
              }))}
            />
          </section>
        )}

        <section id="notes" className="flex flex-col gap-3 scroll-mt-32">
          <h2 className="flex items-center gap-2 text-[--color-text-primary]">
            <StickyNote aria-hidden="true" size={18} className="text-[--color-text-secondary]" />
            Notes
          </h2>
          <DesignerNoteThread
            handoffId={handoff.id}
            notes={notes.map((note) => ({
              id: note.id,
              content: note.content,
              createdAt: note.createdAt.toISOString(),
            }))}
          />
        </section>

        {components.length > 0 && (
          <section id="share" className="flex flex-col gap-3 scroll-mt-32">
            <h2 className="flex items-center gap-2 text-[--color-text-primary]">
              <Share2 aria-hidden="true" size={18} className="text-[--color-text-secondary]" />
              Share
            </h2>
            <ShareLinkPanel
              handoffId={handoff.id}
              shareLinks={shareLinks.map((link) => ({
                id: link.id,
                status: link.status,
                createdAt: link.createdAt.toISOString(),
                expiresAt: link.expiresAt?.toISOString() ?? null,
              }))}
            />
          </section>
        )}
      </div>
      <AskBuildBridgeFab handoffId={handoff.id} />
    </ScreenPinProvider>
  );
}
