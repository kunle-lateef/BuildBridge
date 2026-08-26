import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import { env } from '@/lib/env';

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const NOTIFICATION_QUEUE_NAME = 'notification';

const notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, { connection });

// A separate queue from lib/queue.ts's analysis queue, not a second job
// type merged into it — keeps the analysis queue single-purpose and lets
// each have its own worker process, concurrency, and retry policy.
export type NotificationJobData =
  | { kind: 'analysis-run-finished'; analysisRunId: string }
  | { kind: 'developer-flag-received'; developerFlagId: string }
  | { kind: 'implementation-marked'; implementationMarkId: string };

// BullMQ/IORedis's default lazy-connect + retry behavior means `.add()` can
// hang far longer than an HTTP request should ever wait if Redis is slow or
// unreachable — every caller of enqueueNotification is on a request path
// (the analysis pipeline's final step, the public flag-submission route)
// that must return promptly regardless. A bounded timeout, not IORedis's
// own retry policy, is what actually keeps the "never blocks the request
// that triggers it" guarantee true.
const ENQUEUE_TIMEOUT_MS = 3000;

/**
 * Enqueues a notification-dispatch job. The payload carries only an id —
 * the worker re-reads current state at dispatch time, same discipline
 * AnalysisJobData uses. `attempts: 3` (vs. the analysis queue's `attempts:
 * 1`) since a transient Redis/DB blip here shouldn't silently drop a
 * notification the way a genuinely-failed analysis run shouldn't be
 * blindly retried. Throws (for the caller to catch and log) if Redis
 * doesn't respond within ENQUEUE_TIMEOUT_MS, rather than hanging.
 */
export async function enqueueNotification(data: NotificationJobData): Promise<void> {
  await Promise.race([
    notificationQueue.add('dispatch-notification', data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timed out enqueueing notification job.')), ENQUEUE_TIMEOUT_MS),
    ),
  ]);
}
