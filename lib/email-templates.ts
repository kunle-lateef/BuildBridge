// ---------------------------------------------------------------------------
// Email templates (Figma `12 — Emails`)
//
// Pure functions: data in, { subject, preview, html, text } out, so they can
// be tested and previewed without sending anything. HTML uses tables and
// inline styles because that's what mail clients render reliably; the logo
// is a PNG because Gmail and Outlook block SVG. Every value that came from a
// user (handoff names, a developer's message, a property) goes through
// escapeHtml before it touches markup.
// ---------------------------------------------------------------------------

export type EmailContent = { subject: string; preview: string; html: string; text: string };

const C = {
  page: '#F9FAFC',
  card: '#FFFFFF',
  border: '#E1E5EC',
  ink: '#0E1320',
  body: '#1F2633',
  secondary: '#4A5366',
  primary: '#2B48C8',
  error: '#B42424',
  quoteRule: '#E1E5EC',
};

const FONT = "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

function paragraph(html: string, color = C.body): string {
  return `<p style="margin:0 0 16px;font:400 14px/20px ${FONT};color:${color};">${html}</p>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:8px;background:${C.primary};">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:10px 18px;font:600 14px/20px ${FONT};color:#FFFFFF;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

/** The shared frame: hidden preview text, logo, white card, optional notification footer. */
function layout({ appUrl, preview, title, body, footer }: {
  appUrl: string; preview: string; title: string; body: string; footer: boolean;
}): string {
  const settingsUrl = `${appUrl}/settings?tab=notifications`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:24px 16px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td align="center" style="padding:0 0 16px;"><img src="${escapeHtml(appUrl)}/logo/buildbridge-logo-email.png" width="146" height="28" alt="BuildBridge" style="display:block;border:0;"></td></tr>
<tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:12px;padding:32px;">
<h1 style="margin:0 0 16px;font:600 16px/24px ${FONT};color:${C.ink};">${escapeHtml(title)}</h1>
${body}
</td></tr>
${footer ? `<tr><td align="center" style="padding:16px 0 0;font:400 12px/20px ${FONT};color:${C.secondary};">
You get these emails because they’re on in Settings → Notifications.<br>
BuildBridge · <a href="${escapeHtml(settingsUrl)}" style="color:${C.secondary};text-decoration:underline;">Turn off emails</a>
</td></tr>` : ''}
</table>
</td></tr>
</table>
</body></html>`;
}

const textFooter = (appUrl: string) =>
  `\n\n—\nYou get these emails because they’re on in Settings → Notifications.\nTurn off emails: ${appUrl}/settings?tab=notifications`;

// --- Password reset ---------------------------------------------------------

export function passwordResetEmail({ appUrl, email, resetUrl }: { appUrl: string; email: string; resetUrl: string }): EmailContent {
  const intro = `Someone asked to reset the password for the BuildBridge account ${email}. If that was you, choose a new one below. The link works for 1 hour.`;
  const ignore = 'Didn’t ask for this? Ignore this email. Your password stays the same.';
  return {
    subject: 'Reset your BuildBridge password',
    preview: 'The link works for 1 hour.',
    html: layout({
      appUrl,
      preview: 'The link works for 1 hour.',
      title: 'Reset your password',
      footer: false,
      body: `${paragraph(escapeHtml(intro))}${button('Reset password', resetUrl)}
<p style="margin:16px 0 0;font:400 12px/16px ${FONT};color:${C.secondary};">${escapeHtml(ignore)}</p>`,
    }),
    text: `Reset your password\n\n${intro}\n\nReset password: ${resetUrl}\n\n${ignore}`,
  };
}

// --- Analysis finished / partly finished / didn't finish --------------------

export type AnalysisEmailInput = {
  appUrl: string;
  handoffName: string;
  handoffUrl: string;
  outcome: 'Completed' | 'PartiallyCompleted' | 'Failed';
  screens: number;
  components: number;
  openGaps: number;
  openCritical: number;
  /** Stages that produced something, for a partial run. */
  stagesFinished: number;
  /** Null when the score is hidden (partial run) or there is none. */
  readinessScore: number | null;
  isReady: boolean;
};

export function analysisEmail(input: AnalysisEmailInput): EmailContent {
  const name = input.handoffName;
  const e = escapeHtml;

  if (input.outcome === 'Failed') {
    const body = 'None of the stages finished. Your screens are saved.';
    return {
      subject: `Analysis didn’t finish: ${name}`,
      preview: body,
      html: layout({ appUrl: input.appUrl, preview: body, title: 'Your analysis didn’t finish', footer: true,
        body: `${paragraph(e(body))}${button('Try again', input.handoffUrl)}` }),
      text: `Your analysis didn’t finish\n\n${body}\n\nTry again: ${input.handoffUrl}${textFooter(input.appUrl)}`,
    };
  }

  if (input.outcome === 'PartiallyCompleted') {
    const body = `${input.stagesFinished} of 5 stages finished. Check responsive behavior and gaps by hand.`;
    return {
      subject: `Analysis partly finished: ${name}`,
      preview: body,
      html: layout({ appUrl: input.appUrl, preview: body, title: 'Your analysis partly finished', footer: true,
        body: `${paragraph(e(body))}${button('Review what was found', input.handoffUrl)}` }),
      text: `Your analysis partly finished\n\n${body}\n\nReview what was found: ${input.handoffUrl}${textFooter(input.appUrl)}`,
    };
  }

  const gapsLine = `${input.openGaps}${input.openCritical > 0 ? ` · ${input.openCritical} critical` : ''}`;
  const readinessLine = input.readinessScore === null ? null : `${input.readinessScore}% · ${input.isReady ? 'Ready' : 'Not ready'}`;
  const preview = `${plural(input.components, 'component')} and ${plural(input.openGaps, 'gap')} found.${input.openCritical > 0 ? ` ${input.openCritical} ${input.openCritical === 1 ? 'is' : 'are'} critical.` : ''}`;
  const intro = `BuildBridge finished reading the ${plural(input.screens, 'screen')} in ${name}. Review what it found before you share the link.`;
  const row = (label: string, value: string, color: string) =>
    `<tr><td style="padding:3px 8px 3px 0;font:400 12px/16px ${FONT};color:${C.secondary};">${label}</td><td style="padding:3px 0;font:500 12px/16px ${FONT};color:${color};">${e(value)}</td></tr>`;

  return {
    subject: `Analysis finished: ${name}`,
    preview,
    html: layout({ appUrl: input.appUrl, preview, title: 'Your analysis is ready', footer: true,
      body: `${paragraph(e(intro))}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};border-radius:8px;margin:0 0 16px;"><tr><td style="padding:9px 14px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
${row('Components', String(input.components), C.ink)}
${row('Gaps', gapsLine, input.openCritical > 0 ? C.error : C.ink)}
${readinessLine ? row('Readiness', readinessLine, C.secondary) : ''}
</table></td></tr></table>
${button('Review findings', input.handoffUrl)}` }),
    text: `Your analysis is ready\n\n${intro}\n\nComponents: ${input.components}\nGaps: ${gapsLine}${readinessLine ? `\nReadiness: ${readinessLine}` : ''}\n\nReview findings: ${input.handoffUrl}${textFooter(input.appUrl)}`,
  };
}

// --- Developer flag ---------------------------------------------------------

export function developerFlagEmail({ appUrl, handoffName, kind, target, message, feedbackUrl }: {
  appUrl: string; handoffName: string; kind: 'Mismatch' | 'Question'; target: string | null; message: string; feedbackUrl: string;
}): EmailContent {
  const noun = kind === 'Question' ? 'question' : 'mismatch';
  const title = kind === 'Question' ? 'A developer asked a question' : 'A developer flagged a mismatch';
  const where = target ? `On ${target} in ${handoffName}:` : `On ${handoffName}:`;
  const quoted = `“${message.trim()}”`;
  return {
    subject: `A developer flagged a ${noun}: ${handoffName}`,
    preview: target ? `On ${target}` : `On ${handoffName}`,
    html: layout({ appUrl, preview: target ? `On ${target}` : `On ${handoffName}`, title, footer: true,
      body: `${paragraph(escapeHtml(where))}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;"><tr>
<td style="border-left:3px solid ${C.quoteRule};padding:4px 0 4px 16px;font:400 14px/20px ${FONT};color:${C.body};white-space:pre-line;">${escapeHtml(quoted)}</td>
</tr></table>
${button('Open developer feedback', feedbackUrl)}` }),
    text: `${title}\n\n${where}\n\n${quoted}\n\nOpen developer feedback: ${feedbackUrl}${textFooter(appUrl)}`,
  };
}

// --- Continue on a computer (phone triage "Email me a link") ---------------
//
// Not in Figma `12 — Emails`; follows the same frame. Sent only because the
// designer asked for it on their phone, so there's no notifications footer.

export function continueReviewEmail({ appUrl, handoffName, valuesLeft, reviewUrl }: {
  appUrl: string; handoffName: string; valuesLeft: number; reviewUrl: string;
}): EmailContent {
  const values = plural(valuesLeft, 'value');
  const body = `${values} in ${handoffName} still need you to confirm, change or reject them. That’s easier with the screen beside you, so here’s the link for your computer.`;
  const why = 'You asked for this link from your phone.';
  return {
    subject: `Finish reviewing: ${handoffName}`,
    preview: `${values} left to review.`,
    html: layout({ appUrl, preview: `${values} left to review.`, title: 'Pick up where you left off', footer: false,
      body: `${paragraph(escapeHtml(body))}${button('Open the review', reviewUrl)}
<p style="margin:16px 0 0;font:400 12px/16px ${FONT};color:${C.secondary};">${escapeHtml(why)}</p>` }),
    text: `Pick up where you left off\n\n${body}\n\nOpen the review: ${reviewUrl}\n\n${why}`,
  };
}

// --- Marked implemented -----------------------------------------------------

export function implementationMarkedEmail({ appUrl, handoffName, finding, handoffUrl }: {
  appUrl: string; handoffName: string; finding: string; handoffUrl: string;
}): EmailContent {
  const body = `${finding} in ${handoffName} is now marked implemented on the share link.`;
  return {
    subject: `Marked implemented: ${finding}`,
    preview: `A developer built it on ${handoffName}.`,
    html: layout({ appUrl, preview: `A developer built it on ${handoffName}.`, title: 'A developer marked something implemented', footer: true,
      body: `${paragraph(escapeHtml(body))}${button('Open handoff', handoffUrl)}` }),
    text: `A developer marked something implemented\n\n${body}\n\nOpen handoff: ${handoffUrl}${textFooter(appUrl)}`,
  };
}
