# Workflow: Creating a New API Route

Follow this workflow when you need to add a new route handler or server action to BuildBridge. It chains the architecture, security, and code-style rules with the route scaffolder skill so the new endpoint fits the codebase and doesn't introduce a security or trust-model hole.

## Before You Touch Any File

**Step 1. Decide: route handler or server action?**

- Called by our own dashboard UI as a form submit or UI-triggered mutation (create a handoff, confirm/modify/reject a finding, add a note) → **server action** in `app/(dashboard)/handoffs/[handoffId]/actions.ts`.
- Called without a BuildBridge session — the public share-link view, or the signed-upload-URL issuance itself → **route handler** in `app/api/.../route.ts`. (Creating the `Screen`/`DesignAsset` record a designer's upload attaches to is still a server action — it's only the signed-URL issuance for the file transfer that's the route-handler boundary.)

Server actions are the default for everything a logged-in designer does. There is no external payment-style webhook in this app; the only two "public" boundaries are the share-link read endpoint and upload-URL issuance.

**Step 2. Decide on the data model.**

Sketch the input and the output before writing code. What fields come in? What gets validated? What table rows are read or written? What does success look like? What does failure look like?

If the route touches AI-generated data in any way (triggers an `AnalysisRun`, reads its results, records a `DesignerDecision` against a finding), the sketch must include: which schema in `lib/ai/schemas.ts` governs the data, whether a `DesignerDecision` could already exist on the finding being touched (and what happens if it does), and — if this creates a new `AnalysisRun` — whether the account has quota remaining. See `.agents/skills/api-route-scaffolder/SKILL.md` for the concrete pattern.

**Step 3. Load the right context.**

Open and read in order:

1. `.agents/rules/architecture.md` — where the route lives, data flow conventions, the three kinds of writes.
2. `.agents/rules/security.md` — the non-negotiables for input validation, auth, AI-output trust, and secrets.
3. `.agents/rules/code-style.md` — naming, error handling, logging patterns.
4. `.agents/skills/api-route-scaffolder/SKILL.md` — the route/action template and envelope convention.
5. If the route creates or writes `Component`, `Specification`, `ComponentState`, `ResponsiveRule`, or `HandoffIssue` records: check the AI Processing section of `.agents/rules/architecture.md` and the matching schema in `lib/ai/schemas.ts`.
6. If the route changes the schema: `.agents/skills/db-migration-runner/SKILL.md`.

## Build It

**Step 4. Create the file.**

Use the appropriate template from `.agents/skills/api-route-scaffolder/SKILL.md`. Route handlers go at `app/api/<resource>/route.ts`. Server actions go in a sibling `actions.ts` of the page that triggers them, with `"use server"` at the top.

**Step 5. Write the zod schema first.**

Before any business logic, define the `inputSchema`. Every field the endpoint accepts is in the schema. Nothing outside the schema is trusted. If the client sends a field you did not declare, zod strips it.

**Step 6. Authenticate, then authorize.**

Dashboard actions: is there a valid session? If not, reject. Then check ownership explicitly — `handoff.ownerId === session.userId`. Do not rely on the URL shape to enforce ownership; a crafted URL can target any row.

The public share-link route is the one exception: it checks the `ShareLink` token's status and expiration instead of a session. That check is not optional — see `security.md`'s AI Output & Structured Data Trust section.

**Step 7. Apply rate limiting.**

Unconditionally for any route or server action that triggers a new `AnalysisRun` — per `security.md`'s Rate Limiting section, this applies even though it's a server action, not a public route. Also required for the public routes (share-link reads, upload-URL issuance) and login/signup/password-reset. Use the limiter in `lib/rate-limit.ts`.

**Step 8. Validate again at the boundaries.**

If the route accepts a URL parameter, query string, or the share-link token itself, validate it too. Prisma parameterizes queries, but the principle is that all outside input gets validated regardless of what protects it downstream.

**Step 9. Do the work.**

Keep the body of the try block short. If it's more than ~30 lines, extract the core logic into a function in `lib/`. Route handlers and server actions are thin.

Use `db.$transaction` when two or more writes must succeed together — recording a `DesignerDecision` alongside updating a finding's `reviewStatus` is the most common case in this app.

If this action triggers a new `AnalysisRun`: check for an existing successful run on an unchanged (checksum-matched) `DesignAsset` first and reuse it if found; otherwise check the account's remaining `analysisQuota` before enqueueing the job via `lib/queue.ts`. Never enqueue first and check quota after.

**Step 10. Return the consistent envelope.**

Success: `{ ok: true, data }`.
Failure: `{ ok: false, error: { code, message } }`.

Use proper HTTP status codes: `200` success, `400` invalid input, `401` unauthenticated, `403` unauthorized, `404` not found, `410` gone (expired/revoked share-link token), `409` conflict, `429` rate limited, `500` server error.

**Step 11. Log the right things.**

On success, a single structured log line: `logger.info('handoff.decision.recorded', { handoffId, findingId, action })`.
On failure, log the error with context: `logger.error('analysis.trigger.failed', { error, handoffId })`.
Never log passwords, session tokens, the Anthropic API key, or raw design-asset content.

**Step 12. Revalidate caches (server actions only).**

If the action mutates data displayed elsewhere — especially anything that changes `readinessScore` — call `revalidateTag` or `revalidatePath` so the cache updates. Forget this and the dashboard serves a stale score.

## Check Your Work

**Step 13. Walk the security checklist.**

- [ ] Input validated with zod.
- [ ] AI output (if any) validated against its `lib/ai/schemas.ts` schema before persistence.
- [ ] Session checked (dashboard) or `ShareLink` token validity checked (public route).
- [ ] Ownership check in place where relevant.
- [ ] Rate limit in place: unconditionally for `AnalysisRun` creation (per `security.md` — this applies whether the endpoint is a server action or a public route), and for any public route (e.g. share-link reads).
- [ ] Analysis-quota check happens before enqueueing, not after.
- [ ] No raw error messages returned to the client.
- [ ] No secrets logged.
- [ ] A `DesignerDecision` is never silently overwritten by this endpoint.
- [ ] Database writes that must happen together are in a `db.$transaction`.

**Step 14. Test the happy path and the unhappy paths.**

Hit the route/action with valid input. Confirm success.
Hit it with missing fields. Confirm the `400`.
Hit it without a session (if auth is required). Confirm `401`.
Hit it with a session that doesn't own the resource. Confirm `403`.
For the share-link route: hit it with an expired or revoked token. Confirm it fails closed, not open.
If it triggers analysis: confirm a request over quota is rejected before anything is enqueued.
If rate limiting applies: confirm requests past the limit return `429`, not a silently accepted request.

**Step 15. Check the network tab.**

Confirm the actual HTTP status code matches what you intended. Confirm the response body matches the envelope. Confirm no secret data or other users' data is leaking in the response — this matters especially for the share-link route, which must never leak more than its single scoped handoff's developer-facing data.

**Step 16. Commit.**

Commit message says what the route does in one line. If it's part of a larger feature, reference the feature in the body.

## When Things Go Wrong

If the route starts to do too many things (writing several entities, triggering multiple pipeline stages, updating several caches), stop. That's a sign the logic should move into a service function in `lib/` that the route thinly wraps.

If you need to change the database schema to support this route, stop and read `.agents/skills/db-migration-runner/SKILL.md` before touching `prisma/schema.prisma`. Schema changes deserve their own commit and their own migration, separate from the route that depends on them.
