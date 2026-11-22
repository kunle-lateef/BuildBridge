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
  Completed: 'Analysis finished',
  PartiallyCompleted: 'Analysis partly finished',
  Failed: 'Analysis failed',
};

const ANALYSIS_STAGE_COUNT = 5;

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

type RunSummary = { screens: number; components: number; openGaps: number; openCritical: number; stagesFinished: number };

/**
 * What a finished run found. A stage counts as finished when it produced
 * something, the same rule the Review page's progress panel uses for
 * partial runs.
 */
async function summarizeRun(handoffId: string): Promise<RunSummary> {
  const open = { in: ['Open', 'InReview'] as ('Open' | 'InReview')[] };
  const [screens, components, specifications, states, responsiveRules, issues, openGaps, openCritical] = await Promise.all([
    db.screen.count({ where: { handoffId } }),
    db.component.count({ where: { handoffId } }),
    db.specification.count({ where: { component: { handoffId } } }),
    db.componentState.count({ where: { component: { handoffId } } }),
    db.responsiveRule.count({ where: { screen: { handoffId } } }),
    db.handoffIssue.count({ where: { handoffId } }),
    db.handoffIssue.count({ where: { handoffId, status: open } }),
    db.handoffIssue.count({ where: { handoffId, status: open, severity: 'Critical' } }),
  ]);
  const stagesFinished = [components, specifications, states, responsiveRules, issues].filter((count) => count > 0).length;
  return { screens, components, openGaps, openCritical, stagesFinished };
}

/** The notification's body line for a finished run (Figma `07 — Notifications`). */
function describeRun(status: string, summary: RunSummary | null): string {
  if (status === 'Failed' || !summary) return 'No stages finished. Try running it again.';
  if (status === 'PartiallyCompleted') {
    return `${summary.stagesFinished} of ${ANALYSIS_STAGE_COUNT} stages finished. Review the rest by hand.`;
  }
  return `${plural(summary.components, 'component')} and ${plural(summary.openGaps, 'gap')} found.`;
}

/** Quotes a developer's own words, trimmed to one readable line. */
function quote(message: string): string {
  const oneLine = message.replace(/\s+/g, ' ').trim();
  return `“${oneLine.length > 140 ? `${oneLine.slice(0, 139)}…` : oneLine}”`;
}

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
  const summary = run.status === 'Failed' ? null : await summarizeRun(handoff.id);

  await createNotification({
    userId: handoff.ownerId,
    type: notificationType,
    handoffId: handoff.id,
    title: RUN_STATUS_TITLE[run.status] ?? 'Analysis updated',
    body: describeRun(run.status, summary),
    linkUrl: `/handoffs/${handoff.id}`,
  });

  if (handoff.owner.emailNotificationsEnabled && isEmailableRunStatus(run.status)) {
    await sendAnalysisRunNotificationEmail(handoff.owner.email, {
      handoffName: handoff.name,
      handoffUrl,
      outcome: run.status,
      screens: summary?.screens ?? 0,
      components: summary?.components ?? 0,
      openGaps: summary?.openGaps ?? 0,
      openCritical: summary?.openCritical ?? 0,
      stagesFinished: summary?.stagesFinished ?? 0,
      // Read after the pipeline wrote it: null for a partial run, so the
      // email never shows a score the app itself is hiding.
      readinessScore: handoff.readinessScore,
      isReady: handoff.status === 'Ready',
    });
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
  const feedbackPath = `/handoffs/${handoff.id}?tab=feedback#flag-${flag.id}`;
  const target = flag.findingType && flag.findingReference
    ? await describeFinding(handoff.id, flag.findingType, flag.findingReference)
    : null;

  await createNotification({
    userId: handoff.ownerId,
    type: 'DeveloperFlagReceived',
    handoffId: handoff.id,
    title: flag.kind === 'Question' ? 'New question from a developer' : 'New mismatch from a developer',
    body: quote(flag.message),
    linkUrl: feedbackPath,
  });

  if (handoff.owner.emailNotificationsEnabled) {
    await sendDeveloperFlagNotificationEmail(handoff.owner.email, {
      handoffName: handoff.name,
      kind: flag.kind,
      target: target ? [target.component, target.property].filter(Boolean).join(' · ') : null,
      message: flag.message,
      feedbackUrl: `${env.NEXT_PUBLIC_APP_URL}${feedbackPath}`,
    });
  }
}

type FindingName = { component: string | null; property: string | null; value: string | null };

/**
 * Names a finding the way the share view shows it (component, property,
 * value). Every lookup is scoped to the given handoff, so a reference can
 * never pull a name from someone else's handoff. Null when it's gone.
 */
async function describeFinding(handoffId: string, findingType: string, reference: string): Promise<FindingName | null> {
  if (findingType === 'Specification') {
    const spec = await db.specification.findFirst({
      where: { id: reference, component: { handoffId } },
      select: { property: true, value: true, unit: true, component: { select: { name: true } } },
    });
    if (spec) return { component: spec.component?.name ?? null, property: spec.property, value: `${spec.value}${spec.unit ?? ''}` };
  } else if (findingType === 'ComponentState') {
    const state = await db.componentState.findFirst({
      where: { id: reference, component: { handoffId } },
      select: { name: true, component: { select: { name: true } } },
    });
    if (state) return { component: state.component.name, property: `${state.name.toLowerCase()} state`, value: null };
  } else if (findingType === 'Component') {
    const component = await db.component.findFirst({ where: { id: reference, handoffId }, select: { name: true } });
    if (component) return { component: component.name, property: null, value: null };
  } else if (findingType === 'ResponsiveRule') {
    return { component: null, property: 'A responsive rule', value: null };
  }
  return null;
}

export async function dispatchImplementationMarkNotification(implementationMarkId: string): Promise<void> {
  const mark = await db.implementationMark.findUnique({
    where: { id: implementationMarkId },
    include: { handoff: { include: { owner: true } } },
  });

  if (!mark) return;

  const { handoff } = mark;
  const handoffUrl = `${env.NEXT_PUBLIC_APP_URL}/handoffs/${handoff.id}`;
  const finding = await describeFinding(handoff.id, mark.findingType, mark.findingReference);
  const name = finding ? [finding.component, finding.property].filter(Boolean).join(' ') : 'A finding';

  await createNotification({
    userId: handoff.ownerId,
    type: 'ImplementationMarked',
    handoffId: handoff.id,
    title: 'Finding marked implemented',
    body: `${name}, marked by a developer on the share link.`,
    linkUrl: `/handoffs/${handoff.id}`,
  });

  if (handoff.owner.emailNotificationsEnabled) {
    await sendImplementationMarkedEmail(handoff.owner.email, {
      handoffName: handoff.name,
      finding: finding?.value ? `${name} (${finding.value})` : name,
      handoffUrl,
    });
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
): Promise<(Notification & { handoff: { name: string } | null })[]> {
  return db.notification.findMany({
    where: { userId, ...(opts?.unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: 'desc' },
    take: opts?.limit ?? 20,
    include: { handoff: { select: { name: true } } },
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
