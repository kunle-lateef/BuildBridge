import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ArchiveHandoffButton } from '@/components/handoff/ArchiveHandoffButton';
import { ScreenThumbnail } from '@/components/handoff/ScreenThumbnail';
import { ShareLinkPanel } from '@/components/handoff/ShareLinkPanel';
import { StartAnalysisButton } from '@/components/handoff/StartAnalysisButton';
import { UploadDropzone } from '@/components/handoff/UploadDropzone';
import { AnalysisProgressPanel, type StageProgress } from '@/components/review/AnalysisProgressPanel';
import { AssistantPanel } from '@/components/review/AssistantPanel';
import { ComponentReviewCard } from '@/components/review/ComponentReviewCard';
import { DesignerNoteThread } from '@/components/review/DesignerNoteThread';
import { IssuePanel, type HandoffIssueItem } from '@/components/review/IssuePanel';
import { ReadinessScoreDisplay } from '@/components/review/ReadinessScoreDisplay';
import { ResponsiveRuleList } from '@/components/review/ResponsiveRuleList';
import { HandoffStatusBadge } from '@/components/ui/HandoffStatusBadge';
import { db } from '@/lib/db';
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
    db.specification.findMany({ where: { component: { handoffId } }, select: { provenance: true } }),
    db.componentState.findMany({ where: { component: { handoffId } }, select: { provenance: true } }),
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
    const done = definition.items.length > 0 || isTerminal;
    let status: StageProgress['status'];

    if (done) {
      status = 'done';
    } else if (!runningAssigned && runStatus === 'Processing') {
      status = 'running';
      runningAssigned = true;
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

  const [screens, latestRun, components, issues, unresolvedCriticalCount, shareLinks] = await Promise.all([
    db.screen.findMany({ where: { handoffId }, include: { asset: true }, orderBy: { order: 'asc' } }),
    db.analysisRun.findFirst({ where: { handoffId }, orderBy: { createdAt: 'desc' } }),
    db.component.findMany({
      where: { handoffId },
      include: { specifications: true, states: true },
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

  const notes = await db.designerNote.findMany({ where: { handoffId }, orderBy: { createdAt: 'desc' } });

  const processedScreens = screens.filter((screen) => screen.asset.processingStatus === 'Processed');
  const screenThumbnails = await Promise.all(
    processedScreens.map(async (screen) => ({
      screen,
      imageUrl: await createSignedReadUrl(screen.asset.storageReference),
    })),
  );

  const stages = latestRun ? await buildStageProgress(handoffId, latestRun.status) : null;

  const responsiveRules = await db.responsiveRule.findMany({
    where: { screen: { handoffId } },
    include: { screen: true },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-[length:var(--font-desktop-heading-2-semi-bold-size)] font-semibold text-[--color-text-primary]">
          {handoff.name}
        </h1>
        <div className="flex items-center gap-3">
          <HandoffStatusBadge status={handoff.status} />
          <ArchiveHandoffButton handoffId={handoff.id} isArchived={handoff.status === 'Archived'} />
        </div>
        {handoff.readinessScore !== null && handoff.readinessAlgorithmVersion !== null && (
          <ReadinessScoreDisplay
            score={handoff.readinessScore}
            hasUnresolvedCritical={unresolvedCriticalCount > 0}
            unresolvedCriticalCount={unresolvedCriticalCount}
            algorithmVersion={handoff.readinessAlgorithmVersion}
          />
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-[--color-text-primary]">Screens</h2>
        <UploadDropzone handoffId={handoff.id} />

        {screenThumbnails.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {screenThumbnails.map(({ screen, imageUrl }) => (
              <ScreenThumbnail
                key={screen.id}
                name={screen.name}
                imageUrl={imageUrl}
                analysisStatus={screen.analysisStatus}
              />
            ))}
          </div>
        )}
      </section>

      {processedScreens.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[--color-text-primary]">Analysis</h2>
          <StartAnalysisButton handoffId={handoff.id} />
          {latestRun && stages && <AnalysisProgressPanel runStatus={latestRun.status} stages={stages} />}
        </section>
      )}

      {components.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[--color-text-primary]">Components</h2>
          <div className="flex flex-col gap-4">
            {components.map((component) => (
              <ComponentReviewCard
                key={component.id}
                id={component.id}
                name={component.name}
                type={component.type}
                description={component.description}
                provenance={component.provenance}
                reviewStatus={component.reviewStatus}
                specifications={component.specifications}
                states={component.states}
              />
            ))}
          </div>
        </section>
      )}

      {responsiveRules.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[--color-text-primary]">Responsive behavior</h2>
          <ResponsiveRuleList rules={responsiveRules} />
        </section>
      )}

      {issues.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[--color-text-primary]">Issues</h2>
          <IssuePanel issues={issues as HandoffIssueItem[]} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-[--color-text-primary]">Notes</h2>
        <DesignerNoteThread
          handoffId={handoff.id}
          notes={notes.map((note) => ({ id: note.id, content: note.content, createdAt: note.createdAt.toISOString() }))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[--color-text-primary]">Share</h2>
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

      <section className="flex flex-col gap-3">
        <h2 className="text-[--color-text-primary]">Ask BuildBridge</h2>
        <AssistantPanel handoffId={handoff.id} />
      </section>
    </div>
  );
}
