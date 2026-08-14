import { AiOutputError, callStructured, type ImageInput } from '@/lib/ai/client';
import {
  COMPONENT_DETECTION_SYSTEM_PROMPT,
  GAP_DETECTION_SYSTEM_PROMPT,
  RESPONSIVE_ANALYSIS_SYSTEM_PROMPT,
  SPECIFICATION_SYSTEM_PROMPT,
  STATE_ANALYSIS_SYSTEM_PROMPT,
} from '@/lib/ai/prompts';
import {
  componentDetectionResultSchema,
  gapDetectionResultSchema,
  responsiveAnalysisResultSchema,
  specificationExtractionResultSchema,
  stateAnalysisResultSchema,
} from '@/lib/ai/schemas';
import { db } from '@/lib/db';
import { persistGapDetectionFindings } from '@/lib/decisions';
import { logger } from '@/lib/logger';
import { computeReadiness } from '@/lib/readiness';
import { getObjectBytes } from '@/lib/storage';

type StageFailure = { stage: string; context: string; error: string };

/**
 * Runs all 5 pipeline stages for one AnalysisRun, in the order
 * architecture.md's FK dependencies require (component detection first,
 * since Specification/ComponentState/ComponentInstance all carry a
 * componentId; gap detection last, since it synthesizes 1–4's output).
 * Every stage validates its own Zod schema before persisting — a single
 * stage's failure is recorded and the run continues, never aborting the
 * whole AnalysisRun because one call failed.
 */
export async function runAnalysisPipeline(analysisRunId: string): Promise<void> {
  const run = await db.analysisRun.findUniqueOrThrow({ where: { id: analysisRunId } });
  const { handoffId } = run;

  await db.analysisRun.update({
    where: { id: analysisRunId },
    data: { status: 'Processing', startedAt: new Date() },
  });

  const failures: StageFailure[] = [];
  let anySuccess = false;

  const screens = await db.screen.findMany({
    where: { handoffId },
    include: { asset: true },
    orderBy: { order: 'asc' },
  });

  // Screens already analyzed by a prior run are skipped for stages 1–4 —
  // there's no cross-run matching between "this run's Button" and "last
  // run's Button" (no natural key), so re-processing an already-Analyzed
  // screen would create duplicate Component/Specification/etc rows rather
  // than updating anything. A screen is only ever analyzed once; a new
  // AnalysisRun triggered by adding more screens only processes the new
  // ones. Stage 5 (gap detection) is the exception — it always re-runs
  // against the full current summary, with its own dedup/conflict logic in
  // lib/decisions.ts, since it's explicitly allowed to "re-run cheaply
  // against updated designer decisions" per architecture.md.
  const processedScreens = screens.filter((screen) => screen.asset.processingStatus === 'Processed');
  const screensToAnalyze = processedScreens.filter((screen) => screen.analysisStatus !== 'Analyzed');

  // Stage 1 — component detection, per screen. Must fully complete before
  // stages 2/3 run, since they persist rows carrying a componentId FK.
  const componentIdsByScreen = new Map<string, string[]>();

  for (const [index, screen] of screensToAnalyze.entries()) {
    await db.screen.update({ where: { id: screen.id }, data: { analysisStatus: 'Analyzing' } });

    try {
      const image = await loadImage(screen.asset.storageReference, screen.asset.mediaType);

      const result = await callStructured({
        tier: 'fast',
        schema: componentDetectionResultSchema,
        toolName: 'detect_components',
        toolDescription: 'Reports the UI components detected on this screen.',
        systemPrompt: COMPONENT_DETECTION_SYSTEM_PROMPT,
        userPrompt: 'Identify the meaningful UI components visible on this screen.',
        images: [image],
        fixtureScenario: fixtureScenarioFor(index),
      });

      const componentIds = await db.$transaction(async (tx) => {
        const ids: string[] = [];

        for (const detected of result.components) {
          const component = await tx.component.create({
            data: {
              handoffId,
              name: detected.name,
              type: detected.type,
              description: detected.description,
              confidence: detected.confidence,
              provenance: detected.provenance,
            },
          });
          await tx.componentInstance.create({
            data: {
              componentId: component.id,
              screenId: screen.id,
              regionReference: JSON.stringify(detected.region),
              dimensions: detected.region,
            },
          });
          ids.push(component.id);
        }

        return ids;
      });

      componentIdsByScreen.set(screen.id, componentIds);
      await db.screen.update({ where: { id: screen.id }, data: { analysisStatus: 'Analyzed' } });
      anySuccess = true;
    } catch (error) {
      await db.screen.update({ where: { id: screen.id }, data: { analysisStatus: 'Failed' } });
      recordFailure(failures, analysisRunId, 'component_detection', screen.id, error);
    }
  }

  // Stages 2 + 3 — per component: specification extraction and
  // state/interaction analysis. Independent of each other, both depend on
  // stage 1's Component rows existing.
  for (const [screenId, componentIds] of componentIdsByScreen.entries()) {
    const screen = screensToAnalyze.find((candidate) => candidate.id === screenId);
    if (!screen) continue;

    const image = await loadImage(screen.asset.storageReference, screen.asset.mediaType);

    for (const componentId of componentIds) {
      const component = await db.component.findUniqueOrThrow({ where: { id: componentId } });

      try {
        const result = await callStructured({
          tier: 'fast',
          schema: specificationExtractionResultSchema,
          toolName: 'extract_specifications',
          toolDescription: 'Reports measurable design specifications for one UI component.',
          systemPrompt: SPECIFICATION_SYSTEM_PROMPT,
          userPrompt: `Extract measurable specifications for the "${component.name}" (${component.type}) component on this screen.`,
          images: [image],
        });

        if (result.specifications.length > 0) {
          await db.specification.createMany({
            data: result.specifications.map((spec) => ({
              componentId,
              category: spec.category,
              property: spec.property,
              value: spec.value,
              unit: spec.unit,
              confidence: spec.confidence,
              provenance: spec.provenance,
            })),
          });
        }
        anySuccess = true;
      } catch (error) {
        recordFailure(failures, analysisRunId, 'specification_extraction', componentId, error);
      }

      try {
        const result = await callStructured({
          tier: 'reasoning',
          schema: stateAnalysisResultSchema,
          toolName: 'analyze_states',
          toolDescription: 'Reports likely interaction states for one UI component.',
          systemPrompt: STATE_ANALYSIS_SYSTEM_PROMPT,
          userPrompt: `Analyze likely interaction states for the "${component.name}" (${component.type}) component.`,
          images: [image],
        });

        if (result.states.length > 0) {
          await db.componentState.createMany({
            data: result.states.map((state) => ({
              componentId,
              name: state.name,
              description: state.description,
              confidence: state.confidence,
              provenance: state.provenance,
            })),
          });
        }
        anySuccess = true;
      } catch (error) {
        recordFailure(failures, analysisRunId, 'state_analysis', componentId, error);
      }
    }
  }

  // Stage 4 — responsive analysis, per screen. Screen-scoped only in this
  // implementation, not component-scoped — see lib/analysis.ts's reuse
  // comment for the same kind of deliberate scoping simplification.
  for (const screen of screensToAnalyze) {
    try {
      const image = await loadImage(screen.asset.storageReference, screen.asset.mediaType);

      const result = await callStructured({
        tier: 'reasoning',
        schema: responsiveAnalysisResultSchema,
        toolName: 'analyze_responsive',
        toolDescription: 'Reports responsive layout behavior evidenced by this screen.',
        systemPrompt: RESPONSIVE_ANALYSIS_SYSTEM_PROMPT,
        userPrompt: 'Describe only the responsive/viewport behavior this single screen provides direct evidence for.',
        images: [image],
      });

      if (result.rules.length > 0) {
        await db.responsiveRule.createMany({
          data: result.rules.map((rule) => ({
            screenId: screen.id,
            viewportCategory: rule.viewportCategory,
            behavior: rule.behavior,
            confidence: rule.confidence,
            provenance: rule.provenance,
          })),
        });
      }
      anySuccess = true;
    } catch (error) {
      recordFailure(failures, analysisRunId, 'responsive_analysis', screen.id, error);
    }
  }

  // Stage 5 — gap detection, once per run, synthesizing stages 1–4's
  // persisted output rather than looking at images directly.
  try {
    const summary = await buildHandoffSummary(handoffId);

    const result = await callStructured({
      tier: 'reasoning',
      schema: gapDetectionResultSchema,
      toolName: 'detect_gaps',
      toolDescription: 'Reports genuine implementation gaps found across the whole handoff.',
      systemPrompt: GAP_DETECTION_SYSTEM_PROMPT,
      userPrompt: summary,
    });

    if (result.issues.length > 0) {
      // Reconciles against existing issues rather than persisting
      // unconditionally — this stage re-runs on every AnalysisRun, and a
      // naive createMany here would duplicate still-open issues and, worse,
      // silently resurrect ones the designer already Resolved/Dismissed.
      // See lib/decisions.ts.
      const { createdCount, conflictCount } = await persistGapDetectionFindings(handoffId, result.issues);
      logger.info('pipeline.gap_detection_reconciled', { analysisRunId, createdCount, conflictCount });
    }
    anySuccess = true;
  } catch (error) {
    recordFailure(failures, analysisRunId, 'gap_detection', handoffId, error);
  }

  const finalStatus = !anySuccess ? 'Failed' : failures.length > 0 ? 'PartiallyCompleted' : 'Completed';

  await db.analysisRun.update({
    where: { id: analysisRunId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      errorCode: failures.length > 0 ? summarizeFailures(failures) : null,
    },
  });

  const readiness = await computeReadiness(handoffId);

  await db.handoff.update({
    where: { id: handoffId },
    data: {
      status: 'NeedsReview',
      readinessScore: readiness.overall,
      readinessAlgorithmVersion: readiness.version,
    },
  });

  logger.info('pipeline.run_finished', {
    analysisRunId,
    status: finalStatus,
    failureCount: failures.length,
  });
}

async function loadImage(storageKey: string, mediaType: string): Promise<ImageInput> {
  const bytes = await getObjectBytes(storageKey);
  return { base64: bytes.toString('base64'), mediaType: mediaType as ImageInput['mediaType'] };
}

/** Alternates fixture scenarios across screens so mock mode exercises more than one canned response set. */
function fixtureScenarioFor(screenIndex: number): string {
  return screenIndex % 2 === 0 ? 'login' : 'dashboard';
}

function recordFailure(
  failures: StageFailure[],
  analysisRunId: string,
  stage: string,
  context: string,
  error: unknown,
): void {
  const errorMessage = error instanceof AiOutputError || error instanceof Error ? error.message : 'unknown error';
  failures.push({ stage, context, error: errorMessage });
  logger.error('pipeline.stage_failed', { analysisRunId, stage, context, error: errorMessage });
}

function summarizeFailures(failures: StageFailure[]): string {
  const stages = [...new Set(failures.map((failure) => failure.stage))];
  return `Partial failure in: ${stages.join(', ')} (${failures.length} finding(s) failed validation)`.slice(
    0,
    500,
  );
}

async function buildHandoffSummary(handoffId: string): Promise<string> {
  const [components, specifications, states, responsiveRules, screenCount] = await Promise.all([
    db.component.findMany({ where: { handoffId } }),
    db.specification.findMany({ where: { component: { handoffId } } }),
    db.componentState.findMany({ where: { component: { handoffId } } }),
    db.responsiveRule.findMany({ where: { screen: { handoffId } } }),
    db.screen.count({ where: { handoffId } }),
  ]);

  const lines: string[] = [
    `Handoff has ${screenCount} screen(s) and ${components.length} detected component(s).`,
  ];

  for (const component of components) {
    const componentSpecs = specifications.filter((spec) => spec.componentId === component.id);
    const componentStates = states.filter((state) => state.componentId === component.id);
    const stateSummary =
      componentStates.map((state) => `${state.name} [${state.provenance}]`).join(', ') || 'none reported';

    lines.push(
      `- ${component.name} (${component.type}): ${componentSpecs.length} specification(s) extracted; states: ${stateSummary}.`,
    );
  }

  const responsiveSummary =
    responsiveRules.map((rule) => `${rule.viewportCategory} — ${rule.behavior}`).join('; ') ||
    'no responsive evidence reported';
  lines.push(`Responsive evidence: ${responsiveSummary}.`);

  return lines.join('\n');
}
