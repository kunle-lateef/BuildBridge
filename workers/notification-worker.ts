import 'dotenv/config';

import { Worker } from 'bullmq';
import IORedis from 'ioredis';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { NOTIFICATION_QUEUE_NAME, type NotificationJobData } from '@/lib/notification-queue';
import {
  dispatchAnalysisRunNotification,
  dispatchDeveloperFlagNotification,
  dispatchImplementationMarkNotification,
} from '@/lib/notifications';

// Standalone process, not part of the Next.js server — same shape as
// workers/analysis-worker.ts, its own Redis connection and its own queue.
// Run alongside `next dev` with `npm run worker:notifications`.
const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker<NotificationJobData>(
  NOTIFICATION_QUEUE_NAME,
  async (job) => {
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
  },
  { connection, concurrency: 2 },
);

worker.on('failed', (job, error) => {
  logger.error('notification_worker.job_failed', {
    kind: job?.data.kind,
    error: error.message,
  });
});

logger.info('notification_worker.started', {});
