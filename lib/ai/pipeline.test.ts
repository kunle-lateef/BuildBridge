import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SCREEN = {
  id: 'screen-1',
  handoffId: 'handoff-1',
  order: 0,
  analysisStatus: 'Pending',
  asset: { storageReference: 'key-1', mediaType: 'image/png', processingStatus: 'Processed' },
};

const ALREADY_ANALYZED_SCREEN = {
  id: 'screen-2',
  handoffId: 'handoff-1',
  order: 1,
  analysisStatus: 'Analyzed',
  asset: { storageReference: 'key-2', mediaType: 'image/png', processingStatus: 'Processed' },
};

const DETECTED_COMPONENT = {
  name: 'Primary Button',
  type: 'button',
  description: 'A filled button',
  confidence: 0.9,
  provenance: 'Detected' as const,
  region: { x: 0, y: 0, width: 10, height: 10 },
};

const mockTx = {
  component: { create: vi.fn() },
  componentInstance: { create: vi.fn() },
};

const mockDb = {
  analysisRun: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  screen: { findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
  component: { findUniqueOrThrow: vi.fn(), findMany: vi.fn() },
  componentInstance: { findMany: vi.fn() },
  specification: { createMany: vi.fn(), findMany: vi.fn() },
  componentState: { createMany: vi.fn(), findMany: vi.fn() },
  responsiveRule: { createMany: vi.fn(), findMany: vi.fn() },
  handoff: { update: vi.fn() },
  $transaction: vi.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
};

const mockCallStructured = vi.fn();
const mockGetObjectBytes = vi.fn();
const mockPersistGapDetectionFindings = vi.fn();
const mockComputeReadiness = vi.fn();
const mockEnqueueNotification = vi.fn();

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/ai/client', () => ({
  callStructured: mockCallStructured,
  AiOutputError: class AiOutputError extends Error {},
  currentModelIdentifierSummary: () => 'fast:mock-fast, reasoning:mock-reasoning',
}));
vi.mock('@/lib/storage', () => ({ getObjectBytes: mockGetObjectBytes }));
vi.mock('@/lib/decisions', () => ({ persistGapDetectionFindings: mockPersistGapDetectionFindings }));
vi.mock('@/lib/notification-queue', () => ({ enqueueNotification: mockEnqueueNotification }));
vi.mock('@/lib/readiness', async () => {
  const actual = await vi.importActual<typeof import('../readiness')>('../readiness');
  return { ...actual, computeReadiness: mockComputeReadiness };
});

const { runAnalysisPipeline } = await import('./pipeline');

/** Configures callStructured to succeed for every stage with minimal valid-shaped output. */
function mockAllStagesSucceed() {
  mockCallStructured.mockImplementation(async ({ toolName }: { toolName: string }) => {
    switch (toolName) {
      case 'detect_components':
        return { components: [DETECTED_COMPONENT] };
      case 'extract_specifications':
        return { specifications: [] };
      case 'analyze_states':
        return { states: [] };
      case 'analyze_responsive':
        return { rules: [] };
      case 'detect_gaps':
        return { issues: [] };
      default:
        throw new Error(`unexpected toolName: ${toolName}`);
    }
  });
}

describe('runAnalysisPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$transaction.mockImplementation(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx));
    mockDb.analysisRun.findUniqueOrThrow.mockResolvedValue({ id: 'run-1', handoffId: 'handoff-1' });
    mockDb.screen.findMany.mockResolvedValue([SCREEN]);
    mockDb.screen.count.mockResolvedValue(1);
    mockDb.component.findMany.mockResolvedValue([]);
    mockDb.componentInstance.findMany.mockResolvedValue([]);
    mockDb.specification.findMany.mockResolvedValue([]);
    mockDb.componentState.findMany.mockResolvedValue([]);
    mockDb.responsiveRule.findMany.mockResolvedValue([]);
    mockDb.component.findUniqueOrThrow.mockResolvedValue({ id: 'component-1', name: 'Primary Button', type: 'button' });
    mockTx.component.create.mockResolvedValue({ id: 'component-1' });
    mockGetObjectBytes.mockResolvedValue(Buffer.from('fake-image-bytes'));
    mockComputeReadiness.mockResolvedValue({ version: 1, overall: 80, hasUnresolvedCritical: false, categories: {} });
    mockPersistGapDetectionFindings.mockResolvedValue({ createdCount: 0, reaffirmedCount: 0, conflictCount: 0 });
    mockEnqueueNotification.mockResolvedValue(undefined);
  });

  it('marks the run Completed and the handoff Ready when every stage succeeds with no unresolved Critical issues', async () => {
    mockAllStagesSucceed();

    await runAnalysisPipeline('run-1');

    expect(mockDb.analysisRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: {
        status: 'Completed',
        completedAt: expect.any(Date),
        errorCode: null,
        modelIdentifier: expect.any(String),
      },
    });
    expect(mockDb.handoff.update).toHaveBeenCalledWith({
      where: { id: 'handoff-1' },
      data: { status: 'Ready', readinessScore: 80, readinessAlgorithmVersion: 1 },
    });
  });

  it('snapshots the full computeReadiness result onto the AnalysisRun row, since Handoff.readinessScore is overwritten on every run', async () => {
    mockAllStagesSucceed();
    const readiness = { version: 1, overall: 80, hasUnresolvedCritical: false, categories: { Accessibility: 90 } };
    mockComputeReadiness.mockResolvedValue(readiness);

    await runAnalysisPipeline('run-1');

    expect(mockDb.analysisRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: { readinessSnapshot: readiness },
    });
  });

  it('marks the handoff NeedsReview instead of Ready when readiness reports an unresolved Critical issue', async () => {
    mockAllStagesSucceed();
    mockComputeReadiness.mockResolvedValue({ version: 1, overall: 55, hasUnresolvedCritical: true, categories: {} });

    await runAnalysisPipeline('run-1');

    expect(mockDb.handoff.update).toHaveBeenCalledWith({
      where: { id: 'handoff-1' },
      data: { status: 'NeedsReview', readinessScore: 55, readinessAlgorithmVersion: 1 },
    });
  });

  it('a single failing stage produces PartiallyCompleted, not a failed run — other stages still complete', async () => {
    mockCallStructured.mockImplementation(async ({ toolName }: { toolName: string }) => {
      if (toolName === 'extract_specifications') {
        throw new Error('the model returned malformed output');
      }
      switch (toolName) {
        case 'detect_components':
          return { components: [DETECTED_COMPONENT] };
        case 'analyze_states':
          return { states: [] };
        case 'analyze_responsive':
          return { rules: [] };
        case 'detect_gaps':
          return { issues: [] };
        default:
          throw new Error(`unexpected toolName: ${toolName}`);
      }
    });

    await runAnalysisPipeline('run-1');

    expect(mockDb.analysisRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: {
        status: 'PartiallyCompleted',
        completedAt: expect.any(Date),
        errorCode: expect.stringContaining('specification_extraction'),
        modelIdentifier: expect.any(String),
      },
    });
    // The other stages still ran and persisted despite one failure.
    expect(mockTx.component.create).toHaveBeenCalled();
    expect(mockDb.componentState.createMany).not.toHaveBeenCalled(); // no states returned, but no error either
    // Readiness reports no unresolved Critical here (mockComputeReadiness's
    // default in beforeEach), so status still derives to Ready even on a
    // partially-completed run — completeness and readiness are independent.
    expect(mockDb.handoff.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'Ready' }) }),
    );
  });

  it('marks the run Failed only when every single stage fails', async () => {
    mockCallStructured.mockRejectedValue(new Error('the model is unavailable'));

    await runAnalysisPipeline('run-1');

    expect(mockDb.analysisRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: {
        status: 'Failed',
        completedAt: expect.any(Date),
        errorCode: expect.any(String),
        modelIdentifier: expect.any(String),
      },
    });
    // Readiness/handoff status still gets updated even on a fully-failed run —
    // the pipeline never throws, it always reaches its final bookkeeping step.
    expect(mockDb.handoff.update).toHaveBeenCalled();
  });

  it('skips an already-Analyzed screen for stages 1-4', async () => {
    mockDb.screen.findMany.mockResolvedValue([ALREADY_ANALYZED_SCREEN]);
    mockAllStagesSucceed();

    await runAnalysisPipeline('run-1');

    expect(mockCallStructured).not.toHaveBeenCalledWith(expect.objectContaining({ toolName: 'detect_components' }));
    // Stage 5 (gap detection) still runs unconditionally, since it re-synthesizes persisted data every run.
    expect(mockCallStructured).toHaveBeenCalledWith(expect.objectContaining({ toolName: 'detect_gaps' }));
  });

  it('persists gap-detection findings through the reconciliation path, never a raw createMany', async () => {
    mockCallStructured.mockImplementation(async ({ toolName }: { toolName: string }) => {
      switch (toolName) {
        case 'detect_components':
          return { components: [] };
        case 'analyze_responsive':
          return { rules: [] };
        case 'detect_gaps':
          return {
            issues: [
              {
                title: 'Missing empty state',
                description: 'No empty state shown for the list.',
                severity: 'Medium',
                category: 'InteractionStates',
                recommendation: null,
                provenance: 'Suggested',
                confidence: 0.5,
              },
            ],
          };
        default:
          throw new Error(`unexpected toolName: ${toolName}`);
      }
    });

    await runAnalysisPipeline('run-1');

    expect(mockPersistGapDetectionFindings).toHaveBeenCalledWith(
      'handoff-1',
      'run-1',
      expect.arrayContaining([expect.objectContaining({ title: 'Missing empty state' })]),
    );
  });

  it('merges deterministic touch-target findings with the AI gap-detection findings into one reconciliation call', async () => {
    mockAllStagesSucceed();
    mockDb.componentInstance.findMany.mockResolvedValue([
      {
        screenId: 'screen-1',
        dimensions: { x: 0, y: 0, width: 20, height: 20 },
        component: { name: 'Close icon button', type: 'icon-button' },
        screen: {
          name: 'Checkout',
          asset: { storageReference: 'handoffs/handoff-1/asset-1.png', processingStatus: 'Processed' },
        },
      },
    ]);

    await runAnalysisPipeline('run-1');

    expect(mockPersistGapDetectionFindings).toHaveBeenCalledWith(
      'handoff-1',
      'run-1',
      expect.arrayContaining([
        expect.objectContaining({ category: 'Accessibility', provenance: 'Detected' }),
      ]),
    );
    // A deterministic check succeeding shouldn't itself downgrade a fully
    // successful run to PartiallyCompleted.
    expect(mockDb.analysisRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'Completed' }) }),
    );
  });

  it('merges deterministic cross-component consistency findings with the AI gap-detection findings into the same reconciliation call', async () => {
    mockAllStagesSucceed();
    mockDb.specification.findMany.mockResolvedValue([
      { category: 'Radius', property: 'corner-radius', value: '8', unit: 'px', component: { name: 'Button A' } },
      { category: 'Radius', property: 'corner-radius', value: '8', unit: 'px', component: { name: 'Button B' } },
      { category: 'Radius', property: 'corner-radius', value: '32', unit: 'px', component: { name: 'Button C' } },
    ]);

    await runAnalysisPipeline('run-1');

    expect(mockPersistGapDetectionFindings).toHaveBeenCalledWith(
      'handoff-1',
      'run-1',
      expect.arrayContaining([
        expect.objectContaining({ category: 'VisualSpecifications', provenance: 'Detected' }),
      ]),
    );
    expect(mockDb.analysisRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'Completed' }) }),
    );
  });

  it('merges deterministic contrast findings with the AI gap-detection findings into the same reconciliation call', async () => {
    mockAllStagesSucceed();
    const uniformGrayImage = await sharp(Buffer.alloc(40 * 40 * 3, 128), { raw: { width: 40, height: 40, channels: 3 } })
      .png()
      .toBuffer();
    mockGetObjectBytes.mockResolvedValue(uniformGrayImage);
    mockDb.componentInstance.findMany.mockResolvedValue([
      {
        screenId: 'screen-1',
        dimensions: { x: 5, y: 5, width: 30, height: 30 },
        component: { name: 'Ghost button', type: 'button' },
        screen: {
          name: 'Checkout',
          asset: { storageReference: 'handoffs/handoff-1/asset-1.png', processingStatus: 'Processed' },
        },
      },
    ]);

    await runAnalysisPipeline('run-1');

    expect(mockPersistGapDetectionFindings).toHaveBeenCalledWith(
      'handoff-1',
      'run-1',
      expect.arrayContaining([
        expect.objectContaining({ category: 'Accessibility', provenance: 'Suggested' }),
      ]),
    );
    expect(mockDb.analysisRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'Completed' }) }),
    );
  });

  it('a malformed/undecodable screen image is skipped by the contrast check, not treated as a stage failure', async () => {
    mockAllStagesSucceed();
    mockGetObjectBytes.mockResolvedValue(Buffer.from('not-a-real-image'));
    mockDb.componentInstance.findMany.mockResolvedValue([
      {
        screenId: 'screen-1',
        dimensions: { x: 5, y: 5, width: 30, height: 30 },
        component: { name: 'Ghost button', type: 'button' },
        screen: {
          name: 'Checkout',
          asset: { storageReference: 'handoffs/handoff-1/asset-1.png', processingStatus: 'Processed' },
        },
      },
    ]);

    await runAnalysisPipeline('run-1');

    // checkContrast catches the decode failure per-input (lib/accessibility.ts)
    // rather than throwing, so this never reaches the pipeline's own
    // recordFailure — the run still completes.
    expect(mockDb.analysisRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'Completed' }) }),
    );
  });

  it('enqueues an analysis-run-finished notification job after the run finishes', async () => {
    mockAllStagesSucceed();

    await runAnalysisPipeline('run-1');

    expect(mockEnqueueNotification).toHaveBeenCalledWith({ kind: 'analysis-run-finished', analysisRunId: 'run-1' });
  });

  it('a Redis/queue failure enqueuing the notification never fails the otherwise-successful run', async () => {
    mockAllStagesSucceed();
    mockEnqueueNotification.mockRejectedValue(new Error('redis unreachable'));

    await expect(runAnalysisPipeline('run-1')).resolves.toBeUndefined();

    expect(mockDb.analysisRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'Completed' }) }),
    );
  });
});
