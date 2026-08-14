import 'dotenv/config';

import { Worker } from 'bullmq';
import IORedis from 'ioredis';

import { runAnalysisPipeline } from '@/lib/ai/pipeline';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { ANALYSIS_QUEUE_NAME, type AnalysisJobData } from '@/lib/queue';

// Thin entrypoint — orchestration logic lives in lib/ai/pipeline.ts per
// code-style.md's extraction rule. Run alongside `next dev` with
// `npm run worker`; standalone process, not part of the Next.js server.
const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker<AnalysisJobData>(
  ANALYSIS_QUEUE_NAME,
  async (job) => {
    logger.info('analysis_worker.job_started', { analysisRunId: job.data.analysisRunId });
    await runAnalysisPipeline(job.data.analysisRunId);
    logger.info('analysis_worker.job_completed', { analysisRunId: job.data.analysisRunId });
  },
  { connection, concurrency: 2 },
);

worker.on('failed', async (job, error) => {
  logger.error('analysis_worker.job_failed', {
    analysisRunId: job?.data.analysisRunId,
    error: error.message,
  });

  // The job handler threw before runAnalysisPipeline could mark the run
  // itself — make sure it doesn't stay stuck in Processing/Queued forever.
  if (job?.data.analysisRunId) {
    await db.analysisRun
      .updateMany({
        where: { id: job.data.analysisRunId, status: { in: ['Queued', 'Processing'] } },
        data: { status: 'Failed', completedAt: new Date(), errorCode: error.message.slice(0, 500) },
      })
      .catch((updateError) => {
        logger.error('analysis_worker.failure_recovery_failed', {
          analysisRunId: job.data.analysisRunId,
          error: updateError instanceof Error ? updateError.message : 'unknown',
        });
      });
  }
});

logger.info('analysis_worker.started', {});
