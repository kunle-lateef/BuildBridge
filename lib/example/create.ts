import type { FindingType } from '@prisma/client';

import { CURRENT_ANALYSIS_VERSION } from '@/lib/analysis';
import { db } from '@/lib/db';
import { EXAMPLE, type ExampleComponentKey, type ExampleScreenKey } from '@/lib/example/fixture';
import { logger } from '@/lib/logger';
import { recomputeHandoffReadiness } from '@/lib/readiness';
import { EXAMPLE_ASSET_PREFIX } from '@/lib/storage';

/**
 * "Open the example" (Figma `03 — Dashboard` first run): copies the example
 * fixture into this user's account as a handoff flagged isExample, or
 * returns the one they already have. It looks exactly like an analysed
 * handoff, written with the same shapes the pipeline writes, but:
 *
 * - no AnalysisRun goes through the queue, so no analysis is used and no
 *   notification is sent;
 * - isExample keeps it out of the active-handoff limit, Insights and
 *   Drift, and blocks sharing, uploads and re-analysis;
 * - its screens point at the shared files in public/example/.
 *
 * The 12 findings the fixture marks confirmed get real Confirm decisions,
 * so the audit trail matches their status. Readiness is computed by the
 * formula afterwards, never written in.
 */
export async function createExampleHandoff(userId: string): Promise<{ handoffId: string; created: boolean }> {
  const existing = await db.handoff.findFirst({ where: { ownerId: userId, isExample: true }, select: { id: true } });
  if (existing) return { handoffId: existing.id, created: false };

  const handoffId = await db.$transaction(async (tx) => {
    const handoff = await tx.handoff.create({
      data: { ownerId: userId, name: EXAMPLE.name, description: EXAMPLE.description, status: 'NeedsReview', isExample: true },
    });
    const now = new Date();
    const run = await tx.analysisRun.create({
      data: { handoffId: handoff.id, status: 'Completed', analysisVersion: CURRENT_ANALYSIS_VERSION, startedAt: now, completedAt: now },
    });

    const screenIds = new Map<ExampleScreenKey, string>();
    for (const [order, screen] of EXAMPLE.screens.entries()) {
      const asset = await tx.designAsset.create({
        data: {
          handoffId: handoff.id,
          filename: screen.file,
          mediaType: 'image/png',
          size: 0,
          storageReference: `${EXAMPLE_ASSET_PREFIX}${screen.file}`,
          checksum: `example-${screen.key}`,
          processingStatus: 'Processed',
        },
      });
      const created = await tx.screen.create({
        data: { handoffId: handoff.id, assetId: asset.id, name: screen.name, order, analysisStatus: 'Analyzed' },
      });
      screenIds.set(screen.key, created.id);
    }

    for (const flow of EXAMPLE.flows) {
      await tx.screenFlow.create({
        data: {
          handoffId: handoff.id,
          sourceScreenId: screenIds.get(flow.from) as string,
          targetScreenId: screenIds.get(flow.to) as string,
          label: flow.label,
          createdBy: userId,
        },
      });
    }

    const confirmed: { findingType: FindingType; findingReference: string }[] = [];
    const componentIds = new Map<ExampleComponentKey, string>();
    for (const component of EXAMPLE.components) {
      const screenId = screenIds.get(component.screen) as string;
      const created = await tx.component.create({
        data: {
          handoffId: handoff.id,
          name: component.name,
          type: component.type,
          description: component.description,
          provenance: component.provenance,
          confidence: component.confidence,
          reviewStatus: component.confirmed ? 'Confirmed' : 'Unreviewed',
        },
      });
      componentIds.set(component.key, created.id);
      if (component.confirmed) confirmed.push({ findingType: 'Component', findingReference: created.id });
      await tx.componentInstance.create({
        data: { componentId: created.id, screenId, regionReference: JSON.stringify(component.region), dimensions: component.region },
      });
      for (const spec of component.specifications) {
        const row = await tx.specification.create({
          data: {
            componentId: created.id,
            screenId,
            category: spec.category,
            property: spec.property,
            value: spec.value,
            unit: spec.unit ?? null,
            numericValue: spec.numericValue ?? null,
            provenance: spec.provenance,
            confidence: spec.confidence,
            reviewStatus: spec.confirmed ? 'Confirmed' : 'Unreviewed',
          },
        });
        if (spec.confirmed) confirmed.push({ findingType: 'Specification', findingReference: row.id });
      }
      for (const state of component.states) {
        const row = await tx.componentState.create({
          data: {
            componentId: created.id,
            name: state.name,
            description: state.description,
            provenance: state.provenance,
            confidence: state.confidence,
            reviewStatus: state.confirmed ? 'Confirmed' : 'Unreviewed',
          },
        });
        if (state.confirmed) confirmed.push({ findingType: 'ComponentState', findingReference: row.id });
      }
    }

    for (const rule of EXAMPLE.responsiveRules) {
      await tx.responsiveRule.create({
        data: {
          screenId: screenIds.get('checkout') ?? null,
          componentId: rule.component ? (componentIds.get(rule.component) ?? null) : null,
          viewportCategory: rule.viewportCategory,
          behavior: rule.behavior,
          provenance: rule.provenance,
          confidence: rule.confidence,
        },
      });
    }

    for (const gap of EXAMPLE.gaps) {
      const issue = await tx.handoffIssue.create({
        data: {
          handoffId: handoff.id,
          sourceAnalysisRunId: run.id,
          screenId: gap.screen ? (screenIds.get(gap.screen) ?? null) : null,
          componentId: gap.component ? (componentIds.get(gap.component) ?? null) : null,
          title: gap.title,
          description: gap.description,
          severity: gap.severity,
          category: gap.category,
          recommendation: gap.recommendation ?? null,
          provenance: gap.provenance,
          confidence: gap.confidence,
        },
      });
      await tx.analysisRunFinding.create({ data: { analysisRunId: run.id, handoffIssueId: issue.id, kind: 'Created' } });
    }

    for (const note of EXAMPLE.notes) {
      await tx.designerNote.create({
        data: {
          handoffId: handoff.id,
          componentId: note.component ? (componentIds.get(note.component) ?? null) : null,
          content: note.content,
          createdBy: userId,
        },
      });
    }

    await tx.designerDecision.createMany({
      data: confirmed.map((finding) => ({ handoffId: handoff.id, ...finding, action: 'Confirm' as const, createdBy: userId })),
    });

    return handoff.id;
  });

  await recomputeHandoffReadiness(handoffId, 'NeedsReview');
  logger.info('example.created', { handoffId });
  return { handoffId, created: true };
}
