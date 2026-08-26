// These two error shapes are constructed identically at nearly every server
// action in app/(dashboard)/handoffs/[handoffId]/*-actions.ts — not to hide
// the ownership check itself (that stays explicit and inline at each call
// site per security.md's "explicit, not implied by URL shape"), just to
// stop retyping the same error literal by hand everywhere.
export function unauthenticatedError() {
  return { ok: false as const, error: { code: 'unauthenticated', message: 'Sign in to continue.' } };
}

export function notFoundError(message: string) {
  return { ok: false as const, error: { code: 'not_found', message } };
}
