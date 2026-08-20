import { Resend } from 'resend';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// Resend's shared testing sender — works without a verified domain. Swap
// for a verified BuildBridge domain address before sending real production
// email; Resend rejects unverified custom "from" addresses outside test
// mode.
const FROM_ADDRESS = 'BuildBridge <onboarding@resend.dev>';

let resendClient: Resend | null = null;

function getClient(): Resend {
  resendClient ??= new Resend(env.RESEND_API_KEY);
  return resendClient;
}

/**
 * Failures are logged, not thrown — see security.md's Logging section
 * (never log the recipient's full email alongside failure detail beyond
 * what's needed to debug) and the general "preserve valid user data, don't
 * fabricate success" error-handling rule. The caller (requestPasswordReset)
 * always returns the same generic response whether or not the email
 * actually sent, so a delivery failure doesn't reveal account existence
 * either way — see that action's own comment.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  try {
    await getClient().emails.send({
      from: FROM_ADDRESS,
      to,
      subject: 'Reset your BuildBridge password',
      text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
    });
  } catch (error) {
    logger.error('email.send_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}

const RUN_STATUS_SUBJECT: Record<string, string> = {
  Completed: 'Analysis complete',
  PartiallyCompleted: 'Analysis partially complete',
  Failed: 'Analysis failed',
};

/** Same never-throw contract as sendPasswordResetEmail — called only from lib/notifications.ts, gated on User.emailNotificationsEnabled. */
export async function sendAnalysisRunNotificationEmail(
  to: string,
  handoffName: string,
  status: 'Completed' | 'PartiallyCompleted' | 'Failed',
  handoffUrl: string,
): Promise<void> {
  try {
    await getClient().emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `${RUN_STATUS_SUBJECT[status]}: ${handoffName}`,
      text: `Analysis on "${handoffName}" finished with status ${status}.\n\nReview it: ${handoffUrl}`,
    });
  } catch (error) {
    logger.error('email.send_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}

/** Same never-throw contract as sendPasswordResetEmail — called only from lib/notifications.ts, gated on User.emailNotificationsEnabled. */
export async function sendDeveloperFlagNotificationEmail(
  to: string,
  handoffName: string,
  flagKind: 'Mismatch' | 'Question',
  handoffUrl: string,
): Promise<void> {
  try {
    await getClient().emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `A developer flagged a ${flagKind.toLowerCase()}: ${handoffName}`,
      text: `A developer submitted a ${flagKind.toLowerCase()} on "${handoffName}".\n\nReview it: ${handoffUrl}`,
    });
  } catch (error) {
    logger.error('email.send_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}

/** Same never-throw contract as sendPasswordResetEmail — called only from lib/notifications.ts, gated on User.emailNotificationsEnabled. */
export async function sendImplementationMarkedEmail(to: string, handoffName: string, handoffUrl: string): Promise<void> {
  try {
    await getClient().emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `A developer marked something implemented: ${handoffName}`,
      text: `A developer marked a finding implemented on "${handoffName}".\n\nReview it: ${handoffUrl}`,
    });
  } catch (error) {
    logger.error('email.send_failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}
