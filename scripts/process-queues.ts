import 'dotenv/config';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import { runAnalysisPipeline } from '@/lib/ai/pipeline';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { NOTIFICATION_QUEUE_NAME, type NotificationJobData } from '@/lib/notification-queue';
import {
  dispatchAnalysisRunNotification,
  dispatchDeveloperFlagNotification,
  dispatchImplementationMarkNotification,
} from '@/lib/notifications';
import { ANALYSIS_QUEUE_NAME, type AnalysisJobData } from '@/lib/queue';

/**
 * One-shot drain of both queues, run on a schedule by
 * .github/workflows/process-queues.yml — BuildBridge has no always-on host
 * for workers/analysis-worker.ts and workers/notification-worker.ts's
 * persistent BullMQ Workers (see workers/Dockerfile's comment: needs a
 * platform that supports a long-lived process, which we don't have without
 * adding a card somewhere). This polls both queues instead, processes
 * whatever's waiting, and exits — same per-job logic as the two persistent
 * workers, just not kept running between ticks. Run locally with `npm run
 * queues:process`.
 */
async function drainAnalysisQueue(connection: IORedis): Promise<void> {
  const queue = new Queue<AnalysisJobData>(ANALYSIS_QUEUE_NAME, { connection });
  const jobs = await queue.getJobs(['waiting', 'delayed'], 0, -1);
  logger.info('queue_poll.analysis_started', { jobCount: jobs.length });

  for (const job of jobs) {
    try {
      logger.info('analysis_worker.job_started', { analysisRunId: job.data.analysisRunId });
      await runAnalysisPipeline(job.data.analysisRunId);
      logger.info('analysis_worker.job_completed', { analysisRunId: job.data.analysisRunId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      logger.error('analysis_worker.job_failed', { analysisRunId: job.data.analysisRunId, error: message });

      // Same recovery as workers/analysis-worker.ts's 'failed' handler —
      // don't leave the run stuck in Queued/Processing forever.
      await db.analysisRun
        .updateMany({
          where: { id: job.data.analysisRunId, status: { in: ['Queued', 'Processing'] } },
          data: { status: 'Failed', completedAt: new Date(), errorCode: message.slice(0, 500) },
        })
        .catch((updateError) => {
          logger.error('analysis_worker.failure_recovery_failed', {
            analysisRunId: job.data.analysisRunId,
            error: updateError instanceof Error ? updateError.message : 'unknown',
          });
        });
    } finally {
      await job.remove();
    }
  }

  await queue.close();
}

async function drainNotificationQueue(connection: IORedis): Promise<void> {
  const queue = new Queue<NotificationJobData>(NOTIFICATION_QUEUE_NAME, { connection });
  const jobs = await queue.getJobs(['waiting', 'delayed'], 0, -1);
  logger.info('queue_poll.notification_started', { jobCount: jobs.length });

  for (const job of jobs) {
    try {
      logger.info('notification_worker.job_started', { kind: job.data.kind });

      switch (job.data.kind) {
        case 'analysis-run-finished':
          await dispatchAnalysisRunNotification(job.data.analysisRunId);
          break;
        case 'developer-flag-received':
          await dispatchDeveloperFlagNotification(job.data.developerFlagId);
          break;
        case 'implementation-marked':
          await dispatchImplementationMarkNotification(job.data.implementationMarkId);
          break;
      }

      logger.info('notification_worker.job_completed', { kind: job.data.kind });
    } catch (error) {
      logger.error('notification_worker.job_failed', {
        kind: job.data.kind,
        error: error instanceof Error ? error.message : 'unknown',
      });
    } finally {
      await job.remove();
    }
  }

  await queue.close();
}

async function main(): Promise<void> {
  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

  // Analysis first — a run finishing is what enqueues its own
  // 'analysis-run-finished' notification, so draining in this order lets
  // that notification go out in the same tick instead of waiting for the
  // next scheduled run.
  await drainAnalysisQueue(connection);
  await drainNotificationQueue(connection);

  await connection.quit();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('queue_poll.fatal', { error: error instanceof Error ? error.message : 'unknown' });
    process.exit(1);
  });
