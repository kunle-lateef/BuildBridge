import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import { env } from '@/lib/env';

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const ANALYSIS_QUEUE_NAME = 'analysis';

const analysisQueue = new Queue(ANALYSIS_QUEUE_NAME, { connection });

export type AnalysisJobData = {
  analysisRunId: string;
  handoffId: string;
};

/**
 * Enqueues a single AnalysisRun for the worker to pick up. This function
 * does not check quota itself — its contract assumes the caller has
 * already run the checksum-reuse check and the quota check (see
 * .agents/skills/api-route-scaffolder/SKILL.md's Step 6) and decided an
 * AnalysisRun genuinely needs to be created. Never enqueue first and check
 * quota after.
 */
export async function enqueueAnalysisRun(data: AnalysisJobData): Promise<void> {
  await analysisQueue.add('run-analysis', data, {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 1,
  });
}
