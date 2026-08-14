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
