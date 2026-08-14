# API Route Scaffolder Skill

Load this skill for any task that adds a new server action or route handler to BuildBridge. It chains `architecture.md` and `security.md` into a concrete template so the new endpoint fits the codebase and doesn't introduce a trust-model or security hole.

## What This Skill Does

It gives you the route/action template, the envelope convention, and the specific patterns BuildBridge needs beyond a generic CRUD app: quota enforcement before enqueueing an `AnalysisRun`, schema validation for anything touching AI output, and the ownership/token checks for the two different trust boundaries in this app (an authenticated dashboard user, and an unauthenticated share-link holder).

## Deciding: Server Action or Route Handler?

- Called by our own dashboard UI as a form submit or UI-triggered mutation (create a handoff, confirm a finding, add a note) → **server action** in `app/(dashboard)/handoffs/[handoffId]/actions.ts`.
- Called by the public share-link view, or anything without a BuildBridge session → **route handler** in `app/api/.../route.ts`. In this app, that's essentially just `app/api/share/[token]/route.ts` and `app/api/uploads/route.ts` (issuing a signed upload URL) — there is no external payment-style webhook the way a commerce app would have.

Server actions are the default for everything a logged-in designer does. Route handlers are for the two boundaries: the public share link, and file upload.

## The Envelope Convention

Every server action and route handler returns:

```ts
{ ok: true, data: T } | { ok: false, error: { code: string; message: string } }
```

Use proper HTTP status codes for route handlers: `200` success, `400` invalid input, `401` unauthenticated, `403` unauthorized, `404` not found, `410` gone (expired/revoked share-link token), `409` conflict, `429` rate limited, `500` server error.

## Build It

**Step 1. Write the zod schema first.**

Before any business logic, define the `inputSchema`. Every field the endpoint accepts is in the schema. Nothing outside the schema is trusted. If the client sends a field you did not declare, zod strips it.

If this endpoint touches AI output (e.g., a route that triggers or reads an `AnalysisRun`), the *output* also has a schema — see `lib/ai/schemas.ts` for the per-pipeline-stage schemas. A route/action that persists AI output without running it through the matching schema is a bug, not a shortcut.

**Step 2. Authenticate, then authorize.**

For dashboard server actions: is there a valid session (`getSession()` from `lib/auth.ts`)? If not, return `401`/redirect to login. Then check ownership explicitly — `handoff.ownerId === session.userId` — never assume a nested route param already proves ownership.

For the share-link route handler: there is no BuildBridge session to check. Instead, validate the `[token]` against the `ShareLink` record — active status, not expired, not revoked. This is a different kind of "authorization," but it is not optional; see `security.md`'s AI Output & Structured Data Trust section.

**Step 3. Apply rate limiting.**

Unconditionally for any route or server action that triggers a new `AnalysisRun` — per `security.md`'s Rate Limiting section, this applies even though it's a server action, not a public route. Also required for the public route handlers (share-link reads, upload-URL issuance) and for login/signup/password-reset. Use the limiter in `lib/rate-limit.ts` (in-memory for development, Redis-backed for production) — don't defer this to "later" or treat it as optional polish; it's one of the checklist items below.

**Step 4. Validate again at the boundaries.**

If the route accepts a URL parameter or query string, validate it too — including the share-link `[token]` itself, which should be validated as a well-formed token before it's even used in a database lookup.

**Step 5. Do the work.**

Keep the body of the try block short. If it's more than ~30 lines, extract the core logic into a function in `lib/`. Route handlers and server actions are thin.

Use `db.$transaction` when two or more writes must succeed together. The two recurring examples in this app:
- Recording a `DesignerDecision` and updating the finding's `reviewStatus` together.
- An `AnalysisRun` stage writing its output records (e.g., several `Component` rows) and updating the run's own status together.

**Step 6. Enforce quota before enqueueing analysis.**

BuildBridge's pricing is usage-based, tied to `AnalysisRun` volume — not seat count — because that's the product's actual cost driver. Any action or route that triggers a new `AnalysisRun` must implement this before enqueueing anything:

- Check for an existing successful `AnalysisRun` on an unchanged (checksum-matched) `DesignAsset` first, and reuse it if found — this doesn't consume quota, since it costs the system nothing.
- Otherwise, check the account's current-cycle `analysisUsageCount` against its `analysisQuota` **before** the run is enqueued. A request over quota is rejected immediately with a clear error — never silently queued and left to fail later.
- The quota resets on a rolling monthly cycle anchored to `billingCycleStart` (account creation date is the default anchor for MVP).
- Free tier: a fixed number of included `AnalysisRun`s per month (e.g., 5) and a cap on active Handoffs (e.g., 3). Paid tier: a larger monthly bundle (e.g., 50), blocked at the cap for MVP rather than auto-billed overage — real payment processing and metered overage billing are explicitly post-MVP scope. Neither tier ever degrades analysis *quality* — quotas limit volume only, never accuracy, confidence, or completeness. **Note:** unlike `analysisQuota`/`analysisUsageCount`, `db-migration-runner/SKILL.md`'s `User` model has no field for the "cap on active Handoffs" — confirm with the developer whether this should be a new stored field (like the analysis quota) or a hardcoded per-`planTier` constant before implementing it.
- Current usage should be readable by the dashboard (e.g., "3 of 5 analyses used this month") — quota is never a hidden constraint the user only discovers by hitting it.

**Step 7. Return the consistent envelope.**

**Step 8. Log the right things.**

On success, a single structured log line, e.g. `logger.info('handoff.decision.recorded', { handoffId, findingId, action })`.
On failure, log the error with context: `logger.error('analysis.trigger.failed', { error, handoffId })`.
Never log passwords, session tokens, the Anthropic API key, or full design-asset content.

**Step 9. Revalidate caches (server actions only).**

If the action mutates data that's displayed elsewhere — especially anything that changes the `readinessScore` — call `revalidateTag` or `revalidatePath` so the cache updates. Forget this and the dashboard will show a stale score.

## Check Your Work

**Security checklist:**

- [ ] Input validated with zod.
- [ ] AI output (if any) validated against its `lib/ai/schemas.ts` schema before persistence.
- [ ] Session checked (dashboard actions) or `ShareLink` token checked (public route).
- [ ] Ownership check in place (`handoff.ownerId === session.userId`).
- [ ] Rate limit in place: unconditionally for `AnalysisRun` creation (per `security.md` — this applies whether the endpoint is a server action or a public route), and for any public route (e.g. share-link reads).
- [ ] Analysis-quota check happens before enqueueing, not after.
- [ ] No raw error messages returned to the client.
- [ ] No secrets logged.
- [ ] A `DesignerDecision` is never overwritten by this endpoint without a conflict flag.
- [ ] Database writes that must happen together are in a `db.$transaction`.

**Test the happy path and the unhappy paths.** Valid input succeeds. Missing fields return `400`. No session returns `401` (dashboard) or invalid token returns `404`/`410` (share link). A session that doesn't own the resource returns `403`. Quota exceeded returns the correct rejection, not a silently queued job. Requests past the rate limit return `429`, not a silently accepted request.

## When Things Go Wrong

If a server action starts doing too many things (writing several entities, triggering multiple pipeline stages, revalidating many tags), stop — that's a sign the logic should move into a service function in `lib/` that the action thinly wraps.

If you need to change the database schema to support this route, stop and read `.agents/skills/db-migration-runner/SKILL.md` before touching `prisma/schema.prisma`.
