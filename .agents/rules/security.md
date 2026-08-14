# Security Rules

BuildBridge handles other people's unreleased product designs — often confidential business material — and asks two people (a designer and a developer) to trust an AI's read on them. A security mistake here is not just a bug, it is a breach of that trust. Every agent working on this codebase must follow these rules without exception.

## Secrets and Configuration

Never commit secrets to the repository. API keys, database URLs, session/auth secrets, and storage credentials live in environment variables, loaded through a validated config module.

The required environment variables are:

```
DATABASE_URL
REDIS_URL                     (BullMQ)
ANTHROPIC_API_KEY
AUTH_SECRET                   (or CLERK_SECRET_KEY / CLERK_PUBLISHABLE_KEY if using Clerk instead of Auth.js)
NEXT_PUBLIC_APP_URL
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
STORAGE_BUCKET
```

Environment variables are validated at boot with zod in `lib/env.ts`. If a required variable is missing, the app refuses to start rather than running in a half-configured state.

**Storage config may be incomplete above.** The list assumes an access key, secret, and bucket name are sufficient. `architecture.md` describes the storage layer as "S3-compatible" rather than "AWS S3" specifically, which usually means a non-AWS provider (R2, MinIO, Backblaze, etc.) — those typically also require a `STORAGE_ENDPOINT` (and sometimes `STORAGE_REGION`) that AWS's own S3 doesn't need. Confirm the actual provider with the developer and add the missing variable(s) to this list and to `lib/env.ts`'s schema rather than assuming AWS defaults will work.

Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put a secret behind that prefix, even if you think it looks harmless. `ANTHROPIC_API_KEY` in particular must never reach client code — all Claude API calls happen from `lib/ai/client.ts`, invoked only from server actions, route handlers, or the worker.

## Authentication

Authentication is provider-managed (Auth.js or Clerk) — see `architecture.md`. Never store plaintext passwords or roll a custom credential system. Never log passwords or session tokens, even during debugging.

Sessions are cookie-based. Cookies must have:
- `httpOnly: true`
- `secure: true` in production
- `sameSite: 'lax'`
- A reasonable expiration

Session tokens are managed by the auth provider, which is chosen specifically to avoid the class of bugs that come from hand-rolled session/token generation.

Logout invalidates the session on the server side, not just the cookie. A stolen cookie is useless if the server no longer recognizes its token.

## Input Validation

Every piece of data that enters the application from outside must be validated with zod before it touches the database or any business logic. This applies to:
- Form submissions and server action inputs
- Route handler request bodies
- URL parameters and query strings (including the `[token]` in a share-link URL)
- **Raw AI output from the Claude API**, before it is persisted as a Component, Specification, ComponentState, ResponsiveRule, or HandoffIssue
- File uploads

Validation is not optional and is not the frontend's job. The frontend can validate for user experience, but the server validates for safety — and for AI output, "the server" specifically means the schema in `lib/ai/schemas.ts` corresponding to that pipeline stage.

## SQL Injection

All database access goes through Prisma. Prisma uses parameterized queries by default, which prevents SQL injection as long as you do not bypass it. Never use `prisma.$queryRawUnsafe` or string-concatenate SQL. If you need raw SQL, use `prisma.$queryRaw` with a tagged template, which parameterizes correctly.

## Cross-Site Scripting (XSS)

React escapes strings by default when rendering, which handles most cases. The main risks are:
- `dangerouslySetInnerHTML`: do not use it unless content has been sanitized server-side with a library like DOMPurify. This matters specifically for AI-generated recommendation text and designer notes, both of which are free-text content rendered back to other users.
- User-submitted or AI-derived URLs: never put an unvalidated URL in an `href` or `src`. Validate that it starts with `https://` and, where relevant, that it points to an allowed domain (this includes any URL a `DesignerNote` or `HandoffIssue` recommendation might contain).
- Markdown rendering: if designer notes or AI recommendations are ever rendered as Markdown rather than plain text, use a sanitizing renderer.

## Cross-Site Request Forgery (CSRF)

Server actions in Next.js include built-in CSRF protection. Route handlers that perform state-changing operations must verify the origin of the request by checking the `Origin` or `Referer` header against the app's domain.

The public share-link read endpoint (`app/api/share/[token]/`) is a GET-only, read-only boundary — it doesn't need CSRF protection because it never mutates state, but it still needs the token/expiry/revocation checks described below.

## AI Output & Structured Data Trust

**This is the most important section in this file. Read it twice.** BuildBridge's entire value proposition depends on never letting AI output masquerade as a confirmed fact. A trust-model bug here is not cosmetic — it is the product failing at the one thing it exists to do.

**AI output is never persisted unvalidated.** Every structured result from a Claude API call — for every stage of the analysis pipeline — is validated against its Zod schema in `lib/ai/schemas.ts` before it is written to the database. A schema-validation failure is rejected, logged, and optionally retried. It is never silently stored, and it is never displayed to a designer or developer as if it were valid.

**Provenance is enforced at the data layer, not just the UI layer.** Every AI-generated `Component`, `Specification`, `ComponentState`, `ResponsiveRule`, and `HandoffIssue` carries a `provenance` field (`Detected | Inferred | Suggested`) and a `confidence` value at creation time. There is no code path that creates one of these records without provenance — if a code review finds one, that's a bug, not an edge case.

**A `DesignerDecision` is never silently overwritten.** If a `DesignerDecision` already exists on a finding (Confirm, Modify, Reject, or Override), and a subsequent `AnalysisRun` produces a conflicting result for that same finding, the new result must not auto-apply. Flag the conflict and require designer re-review. Any code path that updates a finding's value without checking for an existing `DesignerDecision` first is a security-relevant bug in this app, on the same level as an auth bypass — it undermines the specific guarantee the product makes.

**Share links expose the developer view only, and nothing else.** The route handler serving a share link must:
- Look up the `ShareLink` by token and verify `status` is active and `expiresAt` (if set) has not passed. Expired or revoked tokens return 404/410, not a partial response.
- Return only the developer-facing projection of the single `Handoff` the link is scoped to — never the designer review interface's data shape, never any other handoff, never raw AI output that hasn't been through the provenance/review pipeline.
- Never leak `ownerId`, other users' data, or internal identifiers not needed by the developer view.

**Ownership checks are explicit, not implied by URL shape.** Every dashboard action on a `Handoff` (and everything under it — screens, components, specs, issues, notes) must check `handoff.ownerId === session.userId` explicitly. Do not rely on a nested route param alone to enforce that a user can only reach their own data; a crafted URL can target any row.

## File Uploads

Design assets are uploaded by designers. They are untrusted input, same as any user-submitted file.

- Accept only supported image types and PDFs, validated by actual file bytes, not the client-provided MIME type.
- Enforce a maximum file size.
- Strip EXIF metadata before storing — a screenshot or export can carry location or device data the designer didn't intend to share.
- Store files in the configured object storage with a random filename. Never use the client's filename directly.
- Serve uploaded design assets from the storage provider's domain or a CDN, never from the same origin as the app.

## Rate Limiting

Apply rate limits to:
- Login and signup (to slow down credential stuffing)
- Password reset requests (if applicable to the chosen auth provider)
- `AnalysisRun` creation (both to protect against abuse and because it's the plan model's quota-enforcement checkpoint — see `.agents/skills/api-route-scaffolder/SKILL.md` for the exact enforcement logic)
- The public share-link read endpoint (to prevent token brute-forcing, since a share-link token is effectively a bearer credential)

Use an in-memory limiter for development and a Redis-backed one for production. The limiter lives in `lib/rate-limit.ts`.

## Logging

Log enough context to debug an incident, never enough to leak user data.

- Log request method, path, status, duration, and a request ID.
- Log user ID (not email, not name) when relevant.
- Log error stacks on the server.
- Never log: passwords, session tokens, the Anthropic API key, storage credentials, full raw design-asset content, or the complete text of a designer note beyond what's needed to debug a specific incident.

## Dependencies

Every dependency is a potential vulnerability. Keep the list small. Run `npm audit` regularly. When a vulnerability is reported, update the package within a week unless the vulnerability does not affect our use case.

Do not install packages with fewer than a few thousand weekly downloads or no recent commits unless the developer approves.

## Incident Response

If a secret is exposed (committed by accident, leaked in a log, shared in a screenshot), rotate it immediately. The order is:
1. Rotate the secret at the provider (Anthropic, database, Redis, storage, auth provider).
2. Update the environment variable in production.
3. Deploy.
4. Revoke the old secret.
5. Tell the developer what happened and when, in writing.

If the exposed secret was `ANTHROPIC_API_KEY`, also check for anomalous usage/spend in the Anthropic console before and immediately after rotation.

Do not try to hide a leak. Fast, honest response limits damage.
