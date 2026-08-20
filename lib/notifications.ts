import type { Notification } from '@prisma/client';

import { db } from '@/lib/db';
import {
  sendAnalysisRunNotificationEmail,
  sendDeveloperFlagNotificationEmail,
  sendImplementationMarkedEmail,
} from '@/lib/email';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import type { ActionResult, NotificationType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Notification dispatch
//
// Called from workers/notification-worker.ts, never directly from a
// request handler — see lib/notification-queue.ts for why this runs off
// the request path. Each dispatch function re-reads current state by id
// (the job payload carries only an id) rather than trusting stale data
// passed at enqueue time.
// ---------------------------------------------------------------------------

const TERMINAL_RUN_STATUS_TYPE: Record<string, NotificationType> = {
  Completed: 'AnalysisRunCompleted',
  PartiallyCompleted: 'AnalysisRunPartiallyCompleted',
  Failed: 'AnalysisRunFailed',
};

const RUN_STATUS_TITLE: Record<string, string> = {
  Completed: 'Analysis complete',
  PartiallyCompleted: 'Analysis partially complete',
  Failed: 'Analysis failed',
};

export async function dispatchAnalysisRunNotification(analysisRunId: string): Promise<void> {
  const run = await db.analysisRun.findUnique({
    where: { id: analysisRunId },
    include: { handoff: { include: { owner: true } } },
  });

  // A queued job can outlive its row (e.g. the handoff was deleted between
  // enqueue and dispatch) — nothing to notify about, not an error.
  if (!run) return;

  const notificationType = TERMINAL_RUN_STATUS_TYPE[run.status];
  if (!notificationType) return; // Queued/Processing aren't terminal — not notification-worthy.

  const { handoff } = run;
  const handoffUrl = `${env.NEXT_PUBLIC_APP_URL}/handoffs/${handoff.id}`;

  await createNotification({
    userId: handoff.ownerId,
    type: notificationType,
    handoffId: handoff.id,
    title: RUN_STATUS_TITLE[run.status] ?? 'Analysis updated',
    body: `"${handoff.name}" finished analysis with status ${run.status}.`,
    linkUrl: `/handoffs/${handoff.id}`,
  });

  if (handoff.owner.emailNotificationsEnabled && isEmailableRunStatus(run.status)) {
    await sendAnalysisRunNotificationEmail(handoff.owner.email, handoff.name, run.status, handoffUrl);
  }
}

function isEmailableRunStatus(status: string): status is 'Completed' | 'PartiallyCompleted' | 'Failed' {
  return status === 'Completed' || status === 'PartiallyCompleted' || status === 'Failed';
}

export async function dispatchDeveloperFlagNotification(developerFlagId: string): Promise<void> {
  const flag = await db.developerFlag.findUnique({
    where: { id: developerFlagId },
    include: { handoff: { include: { owner: true } } },
  });

  if (!flag) return;

  const { handoff } = flag;
  const handoffUrl = `${env.NEXT_PUBLIC_APP_URL}/handoffs/${handoff.id}`;

  await createNotification({
    userId: handoff.ownerId,
    type: 'DeveloperFlagReceived',
    handoffId: handoff.id,
    title: 'Developer feedback received',
    body: `A developer submitted a ${flag.kind.toLowerCase()} on "${handoff.name}".`,
    linkUrl: `/handoffs/${handoff.id}#flag-${flag.id}`,
  });

  if (handoff.owner.emailNotificationsEnabled) {
    await sendDeveloperFlagNotificationEmail(handoff.owner.email, handoff.name, flag.kind, handoffUrl);
  }
}

const FINDING_TYPE_LABEL: Record<string, string> = {
  Component: 'a component',
  Specification: 'a specification',
  ComponentState: 'a state',
  ResponsiveRule: 'a responsive rule',
};

export async function dispatchImplementationMarkNotification(implementationMarkId: string): Promise<void> {
  const mark = await db.implementationMark.findUnique({
    where: { id: implementationMarkId },
    include: { handoff: { include: { owner: true } } },
  });

  if (!mark) return;

  const { handoff } = mark;
  const handoffUrl = `${env.NEXT_PUBLIC_APP_URL}/handoffs/${handoff.id}`;

  await createNotification({
    userId: handoff.ownerId,
    type: 'ImplementationMarked',
    handoffId: handoff.id,
    title: 'Developer marked something implemented',
    body: `A developer marked ${FINDING_TYPE_LABEL[mark.findingType] ?? 'a finding'} implemented on "${handoff.name}".`,
    linkUrl: `/handoffs/${handoff.id}`,
  });

  if (handoff.owner.emailNotificationsEnabled) {
    await sendImplementationMarkedEmail(handoff.owner.email, handoff.name, handoffUrl);
  }
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  handoffId?: string;
  title: string;
  body: string;
  linkUrl?: string;
}): Promise<Notification> {
  const notification = await db.notification.create({ data: input });
  logger.info('notification.created', { notificationId: notification.id, userId: input.userId, type: input.type });
  return notification;
}

// ---------------------------------------------------------------------------
// Reads and read-state — called from the dashboard layout (list) and from
// app/(dashboard)/notifications/actions.ts (mark read), which owns the
// auth()/ownership-check wrapper every other server action in this codebase
// uses. These two functions are the DB-touching core those actions call
// into, not actions themselves.
// ---------------------------------------------------------------------------

export async function listNotifications(
  userId: string,
  opts?: { unreadOnly?: boolean; limit?: number },
): Promise<Notification[]> {
  return db.notification.findMany({
    where: { userId, ...(opts?.unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: 'desc' },
    take: opts?.limit ?? 20,
  });
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<ActionResult<{ id: string }>> {
  const notification = await db.notification.findUnique({ where: { id: notificationId } });

  if (!notification || notification.userId !== userId) {
    return { ok: false, error: { code: 'not_found', message: 'Notification not found.' } };
  }

  await db.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });

  return { ok: true, data: { id: notificationId } };
}

export async function markAllNotificationsRead(userId: string): Promise<ActionResult<{ count: number }>> {
  const { count } = await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  return { ok: true, data: { count } };
}
