import { addMonths, format, isBefore } from 'date-fns';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DeleteHandoffButton } from '@/components/handoff/DeleteHandoffButton';
import { DraftScreenList } from '@/components/handoff/DraftScreenList';
import { HandoffActionsMenu } from '@/components/handoff/HandoffActionsMenu';
import { ScreenFlowList } from '@/components/handoff/ScreenFlowList';
import { ScreenPinProvider } from '@/components/handoff/ScreenPinProvider';
import { ScreenThumbnail } from '@/components/handoff/ScreenThumbnail';
import { StartAnalysisButton } from '@/components/handoff/StartAnalysisButton';
import { UploadDropzone } from '@/components/handoff/UploadDropzone';
import { AnalysisChangelogPanel } from '@/components/review/AnalysisChangelogPanel';
import {
  AnalysisProgressPanel,
  type StageProgress,
} from '@/components/review/AnalysisProgressPanel';
import { AskBuildBridgeFab } from '@/components/review/AskBuildBridgeFab';
import { DesignerNoteThread } from '@/components/review/DesignerNoteThread';
import { DeveloperFlagPanel, type DeveloperFlagItem } from '@/components/review/DeveloperFlagPanel';
import { FindingsPanel, type PanelComponent, type PanelGap } from '@/components/review/FindingsPanel';
import type { GuidedItem } from '@/components/review/GuidedReview';
import { ResponsiveRuleList } from '@/components/review/ResponsiveRuleList';
import { ReviewCanvas } from '@/components/review/ReviewCanvas';
import { ReviewHeader, ReviewTabs, type ReviewTab } from '@/components/review/ReviewHeader';
import { ReviewShortcuts } from '@/components/review/ReviewShortcuts';
import { ReviewWorkspace } from '@/components/review/ReviewWorkspace';
import { RunBanner } from '@/components/review/RunBanner';
import { ShareHandoffButton } from '@/components/review/ShareHandoffButton';
import { buttonVariants } from '@/components/ui/Button';
import { Clock } from '@/components/ui/icons';
import { getAnalysisChangelog } from '@/lib/changelog';
import { db } from '@/lib/db';
import { getGapAnswers } from '@/lib/gapAnswers';
import { getLatestDecisions } from '@/lib/latestDecisions';
import { explainReadiness, rankNextBestActions, SEVERITY_DEDUCTIONS } from '@/lib/readiness';
import { buildReanalysisSummary } from '@/lib/reanalysis';
import { buildScreenPins } from '@/lib/screenPins';
import { createSignedReadUrl } from '@/lib/storage';
import type { AnalysisRunStatus, ProvenanceType } from '@/lib/types';

import { getOwnedHandoffOrNull } from './actions';

type HandoffDetailPageProps = {
  params: Promise<{ handoffId: string }>;
  searchParams?: Promise<{ tab?: string; guided?: string }>;
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
      countLabel: pluralize(components.length, 'component'),
    },
    {
      key: 'specification_extraction',
      label: 'Specification extraction',
      items: specifications,
      countLabel: pluralize(specifications.length, 'spec'),
    },
    {
      key: 'state_analysis',
      label: 'State & interaction analysis',
      items: states,
      countLabel: pluralize(states.length, 'state'),
    },
    {
      key: 'responsive_analysis',
      label: 'Responsive analysis',
      items: responsiveRules,
      countLabel: pluralize(responsiveRules.length, 'rule'),
    },
    {
      key: 'gap_detection',
      label: 'Gap detection',
      items: issues,
      countLabel: pluralize(issues.length, 'gap'),
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

export default async function HandoffDetailPage({ params, searchParams }: HandoffDetailPageProps) {
  const { handoffId } = await params;
  const { tab: tabParam, guided: guidedParam } = (await searchParams) ?? {};
  const handoff = await getOwnedHandoffOrNull(handoffId);

  if (!handoff) {
    notFound();
  }

  const [screens, latestRun, components, issues, unresolvedCriticalCount, shareLinks, owner] =
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
      // For the draft Analysis card's quota line.
      db.user.findUniqueOrThrow({
        where: { id: handoff.ownerId },
        select: { analysisQuota: true, analysisUsageCount: true, billingCycleStart: true },
      }),
    ]);

  const processedScreens = screens.filter(
    (screen) => screen.asset.processingStatus === 'Processed',
  );

  // None of these six depend on one another — previously each was awaited
  // one at a time, turning every page load into a waterfall of round trips
  // instead of one round-trip's worth of wall-clock time.
  const [notes, screenFlows, changelogEntries, developerFlags, implementationMarks, screenThumbnails, stages, responsiveRules, gapAnswers, ruleDecisions, gapDecisions] =
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
        // Fixed order, so a row doesn't jump after the designer edits it.
        orderBy: [{ screen: { order: 'asc' } }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
      getGapAnswers(handoffId),
      getLatestDecisions(handoffId, 'ResponsiveRule'),
      getLatestDecisions(handoffId, 'HandoffIssue'),
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

  // Review progress, for the header line and the tab/"to review" counts.
  // Findings are the four AI-generated, designer-reviewable kinds; gaps
  // count separately as open until resolved or dismissed.
  const allFindings = [...components, ...allSpecifications, ...allStates, ...responsiveRules];
  const reviewedFindingCount = allFindings.filter((finding) => finding.reviewStatus !== 'Unreviewed').length;
  const openGapCount = issues.filter((issue) => issue.status === 'Open' || issue.status === 'InReview').length;
  const toReviewCount = allFindings.length - reviewedFindingCount + openGapCount;
  const openFlagCount = developerFlags.filter((flag) => flag.status === 'Open').length;

  const screenNameById = new Map(screens.map((screen) => [screen.id, screen.name]));
  const componentNameById = new Map(components.map((component) => [component.id, component.name]));
  const gapLocation = (screenId: string | null, componentId: string | null) =>
    [screenId ? screenNameById.get(screenId) : null, componentId ? componentNameById.get(componentId) : null]
      .filter(Boolean)
      .join(' · ') || null;

  // Labels for the Screens, Responsive, Feedback, History and Notes tabs
  // (Figma `04 — Handoff`), all from data already loaded above.
  const isOpenIssue = (issue: (typeof issues)[number]) => issue.status === 'Open' || issue.status === 'InReview';
  const screenMeta = (screenId: string) => {
    const componentIds = new Set(
      components.filter((component) => component.instances.some((instance) => instance.screenId === screenId)).map((component) => component.id),
    );
    const gaps = issues.filter(
      (issue) => isOpenIssue(issue) && (issue.screenId === screenId || (issue.componentId !== null && componentIds.has(issue.componentId))),
    ).length;
    // Gap detection doesn't tie gaps to a screen yet (NewIssueFinding has no
    // screen or component), so "0 gaps" would usually be false: show the
    // count only when gaps really are linked to this screen.
    return gaps > 0 ? `${pluralize(componentIds.size, 'component')} · ${pluralize(gaps, 'gap')}` : pluralize(componentIds.size, 'component');
  };
  const specById = new Map(components.flatMap((component) => component.specifications.map((spec) => [spec.id, { component: component.name, label: spec.property }] as const)));
  const stateById = new Map(components.flatMap((component) => component.states.map((state) => [state.id, { component: component.name, label: state.name }] as const)));
  const findingLabel = (findingType: string | null, reference: string | null): string | null => {
    if (!findingType || !reference) return null;
    if (findingType === 'Specification') { const spec = specById.get(reference); return spec ? `${spec.component} · ${spec.label}` : null; }
    if (findingType === 'ComponentState') { const state = stateById.get(reference); return state ? `${state.component} · ${state.label}` : null; }
    if (findingType === 'Component') return componentNameById.get(reference) ?? null;
    if (findingType === 'ResponsiveRule') {
      const rule = responsiveRules.find((candidate) => candidate.id === reference);
      const component = rule?.componentId ? componentNameById.get(rule.componentId) : null;
      return rule ? `${component ?? 'Layout'} · Responsive` : null;
    }
    if (findingType === 'HandoffIssue') return issues.find((issue) => issue.id === reference)?.title ?? null;
    return null;
  };
  const GAP_DECISION_LABEL: Partial<Record<string, string>> = { Reject: 'Not a gap', Override: 'Answered', Confirm: 'Keep open' };
  const conflictContext = Object.fromEntries(
    changelogEntries.flatMap((entry) => entry.conflicts).flatMap((ref) => {
      const decision = gapDecisions.get(ref.issueId);
      const label = decision ? GAP_DECISION_LABEL[decision.action] : undefined;
      return decision && label ? [[ref.issueId, { decision: label, decidedAt: decision.createdAt.toISOString() }]] : [];
    }),
  );
  const noteItems = notes.map((note) => ({
    id: note.id,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    target:
      (note.componentId ? componentNameById.get(note.componentId) : null) ??
      (note.screenId ? screenNameById.get(note.screenId) : null) ??
      'Whole handoff',
  }));

  const tab: ReviewTab = (['review', 'screens', 'responsive', 'feedback', 'history', 'notes'] as const).includes(
    tabParam as ReviewTab,
  )
    ? (tabParam as ReviewTab)
    : 'review';

  const shareLinkItems = shareLinks.map((link) => ({
    id: link.id,
    status: link.status,
    createdAt: link.createdAt.toISOString(),
    expiresAt: link.expiresAt?.toISOString() ?? null,
  }));

  // Guided review (?guided=1): everything still to decide, in the order
  // the guided panel walks it: gaps by severity, then values by provenance.
  const isGuided = guidedParam === '1' && tab === 'review';
  const isReady = handoff.readinessScore !== null && unresolvedCriticalCount === 0;
  const severityRank: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3, Recommendation: 4 };
  const pinFor = (componentId: string | null) => {
    const screenId = componentId ? pinScreenIdByComponentId.get(componentId) : undefined;
    return screenId && componentId ? { screenId, key: pinKeyFor(componentId) } : null;
  };
  const locate = (componentId: string) => {
    const screenId = pinScreenIdByComponentId.get(componentId);
    return gapLocation(screenId ?? null, componentId);
  };
  const guidedItems: GuidedItem[] = [
    ...issues
      .filter((issue) => issue.status === 'Open' || issue.status === 'InReview')
      .sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9))
      .map(
        (issue): GuidedItem => ({
          key: `HandoffIssue:${issue.id}`,
          findingType: 'HandoffIssue',
          id: issue.id,
          group: 'Gaps',
          title: issue.title,
          value: issue.description,
          where: gapLocation(issue.screenId, issue.componentId),
          provenance: issue.provenance,
          severity: issue.severity,
          description: issue.description,
          recommendation: issue.recommendation,
          makesReady: issue.severity === 'Critical' && unresolvedCriticalCount === 1,
          pin: pinFor(issue.componentId),
        }),
      ),
    ...components.flatMap((component): GuidedItem[] => [
      ...(component.reviewStatus === 'Unreviewed'
        ? [
            {
              key: `Component:${component.id}`,
              findingType: 'Component' as const,
              id: component.id,
              group: component.provenance,
              title: component.name,
              value: component.description ?? component.type,
              where: locate(component.id),
              provenance: component.provenance,
              pin: pinFor(component.id),
            },
          ]
        : []),
      ...component.specifications
        .filter((spec) => spec.reviewStatus === 'Unreviewed')
        .map((spec) => ({
          key: `Specification:${spec.id}`,
          findingType: 'Specification' as const,
          id: spec.id,
          group: spec.provenance,
          title: `${component.name} · ${spec.property}`,
          value: `${spec.value}${spec.unit ?? ''}`,
          where: locate(component.id),
          provenance: spec.provenance,
          pin: pinFor(component.id),
        })),
      ...component.states
        .filter((state) => state.reviewStatus === 'Unreviewed')
        .map((state) => ({
          key: `ComponentState:${state.id}`,
          findingType: 'ComponentState' as const,
          id: state.id,
          group: state.provenance,
          title: `${component.name} · ${state.name}`,
          value: state.description ?? '',
          where: locate(component.id),
          provenance: state.provenance,
          pin: pinFor(component.id),
        })),
    ]),
    ...responsiveRules
      .filter((rule) => rule.reviewStatus === 'Unreviewed')
      .map(
        (rule): GuidedItem => ({
          key: `ResponsiveRule:${rule.id}`,
          findingType: 'ResponsiveRule',
          id: rule.id,
          group: rule.provenance,
          title: `${rule.screen?.name ?? 'Screen'} · ${rule.viewportCategory}`,
          value: rule.behavior,
          where: rule.screen?.name ?? null,
          provenance: rule.provenance,
          pin: pinFor(rule.componentId),
        }),
      ),
  ];

  const analysisBlock = processedScreens.length > 0 && (
    <div className="flex flex-col gap-3">
      <StartAnalysisButton handoffId={handoff.id} />
      {latestRun && stages && <AnalysisProgressPanel runStatus={latestRun.status} stages={stages} />}
    </div>
  );

  // Which screen this is (Figma `04 — Handoff`): a Draft before the first
  // analysis, the Analyzing view while a run is in flight, the failed view
  // when the only run produced nothing, and otherwise the Review layout.
  const runStatus = latestRun?.status;
  const phase: 'draft' | 'analyzing' | 'failed' | 'review' =
    runStatus === 'Queued' || runStatus === 'Processing'
      ? 'analyzing'
      : !latestRun
        ? 'draft'
        : runStatus === 'Failed' && components.length === 0
          ? 'failed'
          : 'review';
  const canvasScreens = screenThumbnails.map(({ screen, imageUrl }) => ({
    id: screen.id,
    name: screen.name,
    imageUrl,
    pins: pinsByScreen.get(screen.id) ?? [],
  }));
  const actionsMenu = <HandoffActionsMenu handoffId={handoff.id} isArchived={handoff.status === 'Archived'} isExample={handoff.isExample} />;
  // The example is never shared publicly (share-link-actions.ts refuses):
  // its button opens the developer preview instead (Figma first run).
  const shareOrPreview = (variant: 'primary' | 'secondary') =>
    handoff.isExample ? (
      <Link href={`/handoffs/${handoff.id}/preview`} className={buttonVariants({ variant })}>
        See what the developer gets
      </Link>
    ) : (
      <ShareHandoffButton handoffId={handoff.id} shareLinks={shareLinkItems} variant={variant} />
    );

  if (phase === 'draft') {
    const cycleEnd = addMonths(owner.billingCycleStart, 1);
    const hasRolledOver = isBefore(cycleEnd, new Date());
    const remaining = hasRolledOver ? owner.analysisQuota : owner.analysisQuota - owner.analysisUsageCount;
    const resetsOn = format(hasRolledOver ? addMonths(new Date(), 1) : cycleEnd, 'MMM d');
    const hasScreens = processedScreens.length > 0;

    return (
      <div className="flex flex-col gap-5">
        <ReviewHeader
          name={handoff.name}
          status={handoff.status}
          readinessScore={null}
          criticalOpenCount={0}
          reviewedCount={0}
          findingCount={0}
          actions={actionsMenu}
          statusLine={
            <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">
              Add the finished screens for this flow, in the order a user sees them. BuildBridge reads them when you start
              the analysis.
            </p>
          }
        />
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-4">
            <UploadDropzone handoffId={handoff.id} />
            <DraftScreenList
              handoffId={handoff.id}
              screens={screenThumbnails.map(({ screen, imageUrl }) => {
                const dims = screen.dimensions as { width?: number | null; height?: number | null } | null;
                const size = `${(screen.asset.size / (1024 * 1024)).toFixed(1)}MB`;
                return {
                  id: screen.id,
                  name: screen.asset.filename,
                  imageUrl,
                  meta: dims?.width && dims.height ? `${dims.width} × ${dims.height} · ${size}` : size,
                };
              })}
            />
          </div>
          <section className="flex flex-col gap-3 rounded-[12px] border border-[--color-border] bg-white p-5">
            <h2 className="m-0 text-[16px] font-medium leading-6 text-[--color-text-primary]">
              {hasScreens ? `Ready to analyze ${pluralize(processedScreens.length, 'screen')}` : 'Analysis'}
            </h2>
            <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">
              {hasScreens
                ? 'BuildBridge finds components, specs, states and gaps on every screen. It takes a few minutes; you can leave this page and we’ll notify you.'
                : 'BuildBridge finds components, specs, states and gaps on every screen. It takes a few minutes for a typical flow.'}
            </p>
            <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">
              {remaining <= 0
                ? `You’ve used all ${owner.analysisQuota} analyses this month. They reset ${resetsOn}.`
                : remaining === 1
                  ? `This uses your last analysis this month. They reset ${resetsOn}.`
                  : `Uses 1 of your ${owner.analysisQuota} analyses this month. You have ${remaining} left.`}
            </p>
            <StartAnalysisButton handoffId={handoff.id} isFullWidth disabled={!hasScreens || remaining <= 0} />
            {!hasScreens && (
              <span className="text-[12px] leading-4 text-[--color-text-secondary]">Add at least one screen to start.</span>
            )}
          </section>
        </div>
      </div>
    );
  }

  if (phase === 'analyzing' || phase === 'failed') {
    const runningStage = stages?.find((stage) => stage.status === 'running');
    const runningIndex = stages ? stages.findIndex((stage) => stage.status === 'running') : -1;
    return (
      <ScreenPinProvider>
        <div className="flex flex-col gap-5">
          <ReviewHeader
            name={handoff.name}
            status={phase === 'failed' ? 'Draft' : handoff.status}
            readinessScore={null}
            criticalOpenCount={0}
            reviewedCount={0}
            findingCount={0}
            actions={actionsMenu}
            statusLine={
              phase === 'analyzing' ? (
                <p className="m-0 flex flex-wrap items-center justify-between gap-2 text-[14px] leading-5">
                  <span className="flex items-center gap-2 text-[--color-text-primary]">
                    <Clock aria-hidden="true" size={14} className="text-[--color-primary]" />
                    Analyzing {pluralize(processedScreens.length, 'screen')}
                    {runningStage && ` · ${runningStage.label} · stage ${runningIndex + 1} of ${stages?.length ?? 5}`}
                  </span>
                  <span className="text-[--color-text-secondary]">Readiness appears when analysis finishes.</span>
                </p>
              ) : null
            }
          />
          {phase === 'failed' && (
            <RunBanner tone="error" title="Analysis failed" action={<StartAnalysisButton handoffId={handoff.id} label="Try again" />}>
              None of the 5 stages finished, so there are no findings yet. Your {pluralize(processedScreens.length, 'screen')}{' '}
              {processedScreens.length === 1 ? 'is' : 'are'} saved.
            </RunBanner>
          )}
          {phase === 'analyzing' && (
            <ReviewTabs
              handoffId={handoff.id}
              current={tab === 'screens' || tab === 'notes' ? tab : 'review'}
              tabs={[
                { key: 'review', label: 'Review' },
                { key: 'screens', label: 'Screens', count: processedScreens.length },
                { key: 'notes', label: 'Notes' },
              ]}
            />
          )}
          {tab === 'notes' && phase === 'analyzing' ? (
            <DesignerNoteThread handoffId={handoff.id} notes={noteItems} />
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <ReviewCanvas screens={canvasScreens} />
              {latestRun && stages && <AnalysisProgressPanel runStatus={latestRun.status} stages={stages} />}
            </div>
          )}
        </div>
      </ScreenPinProvider>
    );
  }

  const incompleteStages = stages?.filter((stage) => stage.status === 'incomplete') ?? [];

  return (
    <ScreenPinProvider>
      <div className="flex flex-col gap-5">
        <ReviewHeader
          name={handoff.name}
          status={handoff.status}
          readinessScore={handoff.readinessScore}
          breakdown={handoff.readinessScore === null ? undefined : { ...explainReadiness(issues), deductions: SEVERITY_DEDUCTIONS }}
          criticalOpenCount={unresolvedCriticalCount}
          reviewedCount={reviewedFindingCount + (issues.length - openGapCount)}
          findingCount={allFindings.length + issues.length}
          actions={
            <>
              <AskBuildBridgeFab handoffId={handoff.id} handoffName={handoff.name} variant="text" />
              {components.length > 0 && shareOrPreview(isReady ? 'primary' : 'secondary')}
              {toReviewCount > 0 && !isGuided && (
                <Link
                  href={`/handoffs/${handoff.id}?guided=1`}
                  className={buttonVariants({ variant: isReady ? 'secondary' : 'primary' })}
                >
                  Review next · {toReviewCount} left
                </Link>
              )}
              <HandoffActionsMenu handoffId={handoff.id} isArchived={handoff.status === 'Archived'} isExample={handoff.isExample} />
            </>
          }
          isExample={handoff.isExample}
          exampleAction={handoff.isExample ? <DeleteHandoffButton handoffId={handoff.id} isExample /> : undefined}
          phoneMenu={
            <HandoffActionsMenu handoffId={handoff.id} isArchived={handoff.status === 'Archived'} isExample={handoff.isExample} />
          }
          phoneActions={
            <>
              {toReviewCount > 0 && !isGuided && (
                <Link
                  href={`/handoffs/${handoff.id}?guided=1`}
                  className={buttonVariants({ variant: isReady ? 'secondary' : 'primary' })}
                >
                  Review next · {toReviewCount} left
                </Link>
              )}
              {components.length > 0 && shareOrPreview(isReady ? 'primary' : 'secondary')}
            </>
          }
        />

        {runStatus === 'PartiallyCompleted' && incompleteStages.length > 0 && (
          <RunBanner
            tone="neutral"
            title={`Partly analyzed: ${(stages?.length ?? 5) - incompleteStages.length} of ${stages?.length ?? 5} stages finished`}
            action={<StartAnalysisButton handoffId={handoff.id} label="Run analysis again" variant="secondary" />}
          >
            {incompleteStages.map((stage) => stage.label).join(' and ')} {incompleteStages.length === 1 ? 'wasn’t' : 'weren’t'} checked.
            Readiness stays hidden until they are, so it can’t look better than it is.
          </RunBanner>
        )}

        <ReviewTabs
          handoffId={handoff.id}
          current={tab}
          tabs={[
            { key: 'review', label: 'Review', count: toReviewCount },
            { key: 'screens', label: 'Screens', count: processedScreens.length },
            { key: 'responsive', label: 'Responsive', count: responsiveRules.length },
            { key: 'feedback', label: 'Developer feedback', count: openFlagCount },
            { key: 'history', label: 'History' },
            { key: 'notes', label: 'Notes' },
          ]}
        />

        {tab === 'review' && !isGuided && <ReviewShortcuts />}
        {tab === 'review' && (
          <ReviewWorkspace
            handoffId={handoff.id}
            isGuided={isGuided}
            guidedItems={guidedItems}
            isBlocked={unresolvedCriticalCount > 0}
            shareButton={shareOrPreview('primary')}
            isExample={handoff.isExample}
            toReviewCount={toReviewCount}
              screens={screenThumbnails.map(({ screen, imageUrl }) => ({
                id: screen.id,
                name: screen.name,
                imageUrl,
                pins: pinsByScreen.get(screen.id) ?? [],
              }))}
            panel={
            <FindingsPanel
              handoffId={handoff.id}
              handoffName={handoff.name}
              toReviewCount={toReviewCount}
              reviewedCount={reviewedFindingCount + (issues.length - openGapCount)}
              notice={components.length === 0 ? analysisBlock : undefined}
              reanalysis={buildReanalysisSummary({
                entries: changelogEntries,
                latestRunId: latestRun?.id ?? null,
                gapDecisions,
                gapAnswers,
              })}
              gaps={issues.map(
                (issue): PanelGap => ({
                  id: issue.id,
                  title: issue.title,
                  description: issue.description,
                  severity: issue.severity,
                  recommendation: issue.recommendation,
                  status: issue.status,
                  provenance: issue.provenance,
                  where: gapLocation(issue.screenId, issue.componentId),
                  answer: gapAnswers.get(issue.id) ?? null,
                  delta: deltaById[issue.id] ?? 0,
                }),
              )}
              components={components.map(
                (component): PanelComponent => {
                  const pinScreenId = pinScreenIdByComponentId.get(component.id) ?? null;
                  const pin = pinScreenId
                    ? pinsByScreen.get(pinScreenId)?.find((candidate) => candidate.key === pinKeyFor(component.id))
                    : undefined;
                  return {
                    handoffId: handoff.id,
                    id: component.id,
                    name: component.name,
                    type: component.type,
                    description: component.description,
                    provenance: component.provenance,
                    reviewStatus: component.reviewStatus,
                    isImplemented: isImplemented('Component', component.id),
                    specifications: component.specifications.map((spec) => ({
                      id: spec.id,
                      property: spec.property,
                      value: spec.value,
                      unit: spec.unit,
                      provenance: spec.provenance,
                      reviewStatus: spec.reviewStatus,
                      isImplemented: isImplemented('Specification', spec.id),
                    })),
                    states: component.states.map((state) => ({
                      ...state,
                      isImplemented: isImplemented('ComponentState', state.id),
                    })),
                    pinNumber: pin?.number ?? null,
                  };
                },
              )}
            />
            }
          />
        )}

        {tab === 'screens' && (
          <section className="flex flex-col gap-4">
            <TabIntro
              actions={
                <>
                  {/* The example is already analysed and takes no uploads (the server refuses both). */}
                  {!handoff.isExample && <UploadDropzone handoffId={handoff.id} variant="button" />}
                  {!handoff.isExample && processedScreens.length > 0 && <StartAnalysisButton handoffId={handoff.id} label="Re-analyze" variant="secondary" />}
                </>
              }
            >
              {/* Reordering is Draft-only (upload-actions.ts): once analysed, the
                  order is part of what was reviewed, so no "Drag to reorder" here. */}
              {pluralize(screenThumbnails.length, 'screen')}, in the order developers see them.
            </TabIntro>
            {screenThumbnails.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {screenThumbnails.map(({ screen, imageUrl }, index) => (
                  <ScreenThumbnail
                    key={screen.id}
                    screenId={screen.id}
                    name={screen.name}
                    imageUrl={imageUrl}
                    analysisStatus={screen.analysisStatus}
                    order={index + 1}
                    meta={screenMeta(screen.id)}
                    pins={pinsByScreen.get(screen.id) ?? []}
                  />
                ))}
              </div>
            )}
            {!handoff.isExample && (
              <p className="m-0 text-[12px] leading-4 text-[--color-text-secondary]">
                Re-analyzing checks new and changed screens. Screens that haven’t changed don’t use an analysis.
              </p>
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
        )}

        {tab === 'responsive' && (
          <section className="flex flex-col gap-4">
            <TabIntro>How the layout changes on each viewport. Confirm what’s right; gaps show where the design doesn’t say.</TabIntro>
            {responsiveRules.length > 0 || issues.some((issue) => isOpenIssue(issue) && issue.category === 'ResponsiveBehavior') ? (
              <ResponsiveRuleList
                handoffId={handoff.id}
                rules={responsiveRules.map((rule) => ({
                  id: rule.id,
                  viewportCategory: rule.viewportCategory,
                  behavior: rule.behavior,
                  provenance: rule.provenance,
                  reviewStatus: rule.reviewStatus,
                  isImplemented: isImplemented('ResponsiveRule', rule.id),
                  previousValue: ruleDecisions.get(rule.id)?.action === 'Modify' ? ruleDecisions.get(rule.id)?.previousValue : null,
                }))}
                gaps={issues
                  .filter((issue) => isOpenIssue(issue) && issue.category === 'ResponsiveBehavior')
                  .map((issue) => ({ id: issue.id, title: issue.title, viewportLabel: null }))}
              />
            ) : (
              <EmptyTab>No responsive behavior found yet.</EmptyTab>
            )}
          </section>
        )}

        {tab === 'feedback' && (
          <section className="flex flex-col gap-4">
            <TabIntro>Questions and mismatches developers flagged on the share link. They see the status you set.</TabIntro>
            {developerFlags.length > 0 ? (
              <DeveloperFlagPanel
                flags={developerFlags.map((flag): DeveloperFlagItem => ({
                  id: flag.id,
                  kind: flag.kind,
                  message: flag.message,
                  submittedByName: flag.submittedByName,
                  status: flag.status,
                  createdAt: flag.createdAt.toISOString(),
                  target: findingLabel(flag.findingType, flag.findingReference),
                }))}
              />
            ) : (
              <EmptyTab>No developer feedback yet. Flags from your share link show up here.</EmptyTab>
            )}
          </section>
        )}

        {tab === 'history' && (
          <section className="flex flex-col gap-4">
            <TabIntro>Each analysis run and what it changed. Your decisions are never overwritten; conflicts come back to you.</TabIntro>
            {changelogEntries.length > 0 ? (
              <AnalysisChangelogPanel entries={changelogEntries} conflictContext={conflictContext} />
            ) : (
              <EmptyTab>No analysis history yet.</EmptyTab>
            )}
          </section>
        )}

        {tab === 'notes' && (
          <section className="flex flex-col gap-4">
            <TabIntro>Context for the developer that the screens can’t show. Notes appear in the developer view under Implementation notes.</TabIntro>
            <DesignerNoteThread handoffId={handoff.id} notes={noteItems} />
          </section>
        )}
      </div>
    </ScreenPinProvider>
  );
}

/** The one-line description each tab opens with (Figma), with optional actions on the right. */
function TabIntro({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 text-[14px] leading-5 text-[--color-text-secondary]">{children}</p>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function EmptyTab({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 rounded-[12px] border border-[--color-border] bg-white px-4 py-6 text-[14px] leading-5 text-[--color-text-secondary]">
      {children}
    </p>
  );
}
