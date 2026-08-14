# Architecture Rules

These rules describe how BuildBridge is put together. Every agent building features must follow this architecture. Do not introduce new patterns without discussing them with the developer first.

## The Stack

BuildBridge is a Next.js application using the App Router, written in TypeScript end-to-end, backed by PostgreSQL through Prisma. AI analysis runs through the Claude API. Structured AI output and all external input are validated with Zod. The asynchronous analysis pipeline runs on BullMQ, backed by Redis. Styling is handled by Tailwind CSS, driven by the tokens in `design-system.md`. There is no separate backend service. Everything lives in the Next.js app, using server components, server actions, route handlers, and a small set of background workers.

**Why these choices, briefly:**
- **Next.js App Router, one app, no separate backend** — the whole product is CRUD plus an AI pipeline over a single Postgres database; a separate API service would add a network hop and a second deploy target for no capability BuildBridge needs at this stage.
- **PostgreSQL via Prisma** — the domain is relational (`Handoff` → `Screen`/`Component` → `Specification`/`ComponentState`, `DesignerDecision` referencing findings across tables); foreign keys and transactions are load-bearing for the trust model (see Data Flow, below), not optional structure a document store would let us skip.
- **Zod everywhere a trust boundary is crossed** — the product's entire value proposition is "AI output is never trusted until validated" (see `AGENTS.md`'s Non-Negotiables); Zod is the one mechanism that enforces that for both user input and AI output, and `z.infer` keeps the runtime check and the TypeScript type from drifting apart (see `code-style.md`).
- **BullMQ + Redis for the analysis pipeline** — analysis is slow, multi-stage, and must survive a single stage failing without losing the run (see AI Processing, below); a request/response cycle can't hold a job open that long, and BullMQ gives per-job retry and status tracking without hand-rolling a job table.
- **Provider-managed auth** — session/credential handling is exactly the kind of code where a subtle bug is a breach, not just a bug; see `security.md`.

These are the developer's calls, not defaults to reconsider mid-task — if a task seems to need a different piece of infrastructure, that's a sign to ask, not to swap the stack.

## Directory Layout

```
app/
├── (marketing)/                public landing pages, logged-out experience
├── (dashboard)/                authenticated designer dashboard, grouped by layout
│   ├── handoffs/
│   │   ├── [handoffId]/        handoff detail: upload, review, issues, readiness
│   │   └── page.tsx            handoff list
│   └── settings/
├── share/[token]/               public developer-facing handoff view — the ShareLink target
├── api/
│   ├── auth/                    auth provider route handlers (Auth.js/Clerk callback routes)
│   ├── uploads/                 signed upload URL issuance for design assets
│   └── share/[token]/           public, read-only share-link data endpoint
└── layout.tsx                   root layout

components/
├── ui/                          primitives (Button, Input, Card, Badge, etc.)
├── handoff/                     Handoff/Screen/Component/Specification-specific
├── review/                      review-screen specific — provenance badges, issue panel, readiness score
├── dashboard/                   dashboard-specific
└── shared/                      shared across the app

lib/
├── env.ts                       environment variable validation (boot-time) — see security.md's Secrets and Configuration rules
├── db.ts                        Prisma client singleton
├── auth.ts                      session and auth helpers
├── logger.ts                    structured logger — see security.md's Logging rules
├── rate-limit.ts                rate limiter (in-memory dev, Redis-backed prod) — see security.md's Rate Limiting rules
├── cn.ts                        className merge utility — used by every component, per component-builder's SKILL.md template
├── ai/
│   ├── client.ts                 Claude API wrapper
│   └── schemas.ts                Zod schemas for each analysis pipeline stage
├── storage.ts                   S3-compatible object storage wrapper
├── queue.ts                     BullMQ queue setup
├── readiness.ts                 readiness score formula (versioned)
├── types.ts                     shared TypeScript types (ProvenanceType, ReviewStatus, IssueSeverity, etc.) — see code-style.md
└── validators/                  zod schemas for input validation

workers/
└── analysis-worker.ts           BullMQ worker running the 5-stage analysis pipeline

prisma/
├── schema.prisma                single source of truth for the database
└── migrations/                  generated migration files

public/                          static assets, logo
```

## Rendering Rules

The developer-facing share-link view at `app/share/[token]/` must be server-rendered. It is the page a developer opens with no prior context on the product — it must load fast and never require a client-side data fetch before showing anything meaningful. It is read-only: the person viewing it may not even be a BuildBridge account holder.

The designer dashboard (including the review screen) can use client components where interactivity is needed — confirming a finding, editing a value, expanding a component's detail — but data fetching happens on the server. Do not fetch from route handlers inside client components when a server component can pass the data down directly.

## Data Flow

There are three kinds of writes in this app:

1. **Designer-initiated writes from the dashboard** go through server actions. Creating a handoff, triggering an upload's analysis, and every `DesignerDecision` (confirm, modify, reject, override) call a server action, which validates input with zod, writes to the database through Prisma, and revalidates the relevant cache tags — including the handoff's cached `readinessScore` when a decision changes it.

2. **AI-initiated writes from the analysis pipeline** happen inside `workers/analysis-worker.ts`, not in a request/response cycle. Each of the five pipeline stages (see AI Processing, below) validates its own output against its Zod schema before writing anything. A stage's output is never trusted as-is, and a `DesignerDecision` that already exists on a finding is never overwritten by a later run — conflicting results are flagged for re-review instead of applied.

3. **Public reads from a share link** go through the route handler at `app/api/share/[token]/`. This is the one boundary in the app that serves data without an authenticated BuildBridge session. It validates the token against the `ShareLink` record (checking `status` and `expiresAt`), and returns only the developer-facing projection of that single handoff — never the designer review data, never any other handoff. There is no public write path in BuildBridge; unlike a checkout flow, nothing on the public side ever mutates data.

## State Management

There is no global state library. React state and server data are enough. If you feel the urge to add Redux, Zustand, or Jotai, stop and reconsider. The review screen has real local interaction (expanding components, editing a value inline) but it is scoped to that screen — `useState` plus server actions cover every case.

## Database Access

All database access goes through Prisma. Raw SQL is only allowed in migration files. Every query that takes user input must use Prisma's parameterized query builder, never string interpolation.

The Prisma client is imported from `lib/db.ts`, which exports a singleton. Do not instantiate `new PrismaClient()` anywhere else; creating multiple clients exhausts the connection pool in development.

`AnalysisRun` records are treated as immutable historical records once created — see `.agents/skills/db-migration-runner/SKILL.md` before writing any migration that would update or delete existing `AnalysisRun` rows.

## AI Processing

Analysis is asynchronous and stage-based, never a single blocking call: `Upload → Validate → Process → Analyze → Validate AI Output → Persist → Review`. `lib/queue.ts` enqueues an `AnalysisRun`; `workers/analysis-worker.ts` runs the five stages below in order. AI output is never treated as inherently trustworthy — every stage's structured output is validated against its Zod schema before it can enter trusted application state or be displayed to a user.

**Analysis stage breakdown** (each stage is a distinct, independently retryable tool-use call against the Claude API):

| Stage | Purpose | Output schema (validated via Zod) | Model tier guidance |
|---|---|---|---|
| 1. Component detection | Identify components and their regions on the screen | `Component[]` + `ComponentInstance[]`, each with provenance/confidence | Lighter/faster model — largely visual pattern recognition, high volume (one pass per screen) |
| 2. Specification extraction | Extract measurable values (spacing, typography, color, dimensions, radius, shadow) per detected component | `Specification[]` with category/property/value/unit/provenance/confidence | Lighter/faster model — measurable, low-ambiguity extraction |
| 3. State & interaction analysis | Infer likely states (hover, focus, loading, error, empty, disabled) per component | `ComponentState[]` with provenance/confidence — Suggested by default unless explicit visual evidence exists (e.g., multiple frames showing a state) | Stronger reasoning model — inference-heavy, most prone to false confidence if under-powered |
| 4. Responsive analysis | Compare multiple viewport screens (if present) or infer likely responsive behavior | `ResponsiveRule[]` with provenance/confidence | Stronger reasoning model — cross-screen comparison |
| 5. Gap detection | Synthesize stages 1–4 into HandoffIssues | `HandoffIssue[]` with severity/category/recommendation | Stronger reasoning model — requires holistic judgment across all prior stage outputs, run last so it has full context |

"Model tier guidance" above is relative (lighter/faster vs. stronger reasoning), not a fixed model identifier — the actual stage-to-model mapping is configured in `lib/ai/client.ts` and is the developer's call to set and change as models improve or costs shift, not something to hardcode from this table.

Rules that follow from this table:

- A single stage's failure produces a `PartiallyCompleted` run rather than discarding the whole analysis — never fail the entire `AnalysisRun` because one stage errored.
- **Stage 1 (component detection) runs first and blocks stages 2 and 3.** `Specification` and `ComponentState` both carry a `componentId` foreign key (see `.agents/skills/db-migration-runner/SKILL.md`'s logical data model), so stages 2 and 3 cannot persist their output until stage 1's `Component` rows exist to attach to. Stage 4 (responsive analysis) can run independently of stage 1 when it's producing screen-level rules (`screenId`), but depends on stage 1 the same way stages 2 and 3 do when it's producing component-scoped rules (`componentId`).
- Stage 5 (gap detection) runs only after stages 1–4 complete or explicitly fail, since it needs to know what *was* found in order to reason about what's missing.
- Every stage's raw output is validated against its schema in `lib/ai/schemas.ts` before any `Component`/`Specification`/`ComponentState`/`ResponsiveRule`/`HandoffIssue` record is persisted; a schema-validation failure on one stage does not block the others.
- **Cost control:** identical, unchanged `DesignAsset`s (matched by checksum) reuse the most recent successful `AnalysisRun`'s output rather than re-running stages 1–4. Gap detection may still re-run cheaply against updated designer decisions without re-analyzing the image itself. This reuse also means the request does not consume the account's analysis quota — see `security.md` and `.agents/skills/api-route-scaffolder/SKILL.md` for the quota-enforcement checkpoint this feeds into.
- A `DesignerDecision` that already exists on a finding is never overwritten by a later run's output for that same finding — conflicting results are flagged for re-review instead of applied.

## Contextual Assistant (Phase P2) — the one exception to "never call Claude directly"

The contextual assistant's `sendAssistantMessage` path (`app/api/assistant/route.ts`, `lib/ai/client.ts`'s `streamAssistantReply`) calls Claude directly from a route handler with a streamed response, **not** through `lib/queue.ts`. This is a deliberate, narrow, developer-approved exception to the rule below in What Not to Do — decided because the rule's actual concern (blocking a request for minutes with no retry/status tracking, the shape of the 5-stage pipeline) doesn't describe a single conversational turn, and streaming is the standard, expected UX for conversational AI. Do not use this as precedent for adding another direct Claude call elsewhere — the analysis pipeline stays queue-based.

What still applies unchanged: the response is validated (length/non-empty) before being persisted as an `AIMessage`, never persisted unvalidated; the system prompt is static and never assembled from asset-derived content (same prompt-injection defense as the 5-stage pipeline); ownership is checked before any message is processed; the endpoint is rate-limited.

## Readiness Score

`lib/readiness.ts` computes `Handoff.readinessScore` as a pure function over already-persisted application data — never a model call. This is what "deterministic and explainable" means architecturally: given the same inputs it always produces the same output, and that output can be explained by pointing at the specific rows that fed it, not by re-asking the AI.

Which fields it reads and how it weights them is not decided here — see `AGENTS.md`'s "When in Doubt" section and do not guess at it, including from the description above; "pure function over persisted data" is an architectural constraint on *how* the formula must be shaped, not a description of its inputs. What *is* architectural: every `Handoff` stores the `readinessAlgorithmVersion` that produced its cached `readinessScore` (see `.agents/skills/db-migration-runner/SKILL.md`'s logical data model). If the formula in `lib/readiness.ts` changes, bump that version rather than silently changing what an existing score means — a handoff scored under v1 and one scored under v2 are not directly comparable, and the version field is what makes that fact visible instead of hidden.

The score is recalculated and cached (not computed on every read) whenever a `DesignerDecision` changes a finding that feeds it — see Data Flow, above, and the cache-revalidation step in `.agents/skills/api-route-scaffolder/SKILL.md`.

## Authentication

Authentication is provider-managed (Auth.js or Clerk) — never hand-rolled. Sessions are cookie-based under the hood regardless of provider. Cookies are `httpOnly`, `secure` in production, and `sameSite: lax`. The session helper in `lib/auth.ts` wraps the provider and exposes `getSession()` for server components and server actions. Client components that need auth state receive it as a prop from their parent server component.

The public share-link route is the one place in the app that intentionally does not check a BuildBridge session — it checks the `ShareLink` token instead. See `security.md` for the specific checks required there.

## Error Handling

Server actions and route handlers return structured responses. Success is `{ ok: true, data }` and failure is `{ ok: false, error: { code, message } }`. The client never receives raw exception messages, stack traces, or Prisma error objects. Log the full error on the server, return a sanitized message to the user.

This applies to application errors, not to AI epistemic uncertainty — those are two different things. An AI analysis stage that can't determine something isn't an "error" in this sense; it's a `HandoffIssue` or a Suggested-provenance finding with low confidence, and it's handled per the AI trust model, not the error envelope.

## Environments

- `development` runs locally against a local PostgreSQL, local Redis, and Claude API keys scoped to a low-spend development budget.
- `production` runs on the deployment target with production Claude API keys, production database, and production Redis.

There is no staging environment yet. When we add one, it will use a separate production-shaped database and a Claude API key with its own spend cap.

## What Not to Do

- Do not add GraphQL. Server actions and REST route handlers are enough.
- Do not add a separate Node or Express backend. Everything stays in Next.js.
- Do not reach for microservices. This is one app plus its background workers.
- Do not build a custom auth system from scratch. Auth.js/Clerk is already the decision — see `AGENTS.md`'s Tech Stack section.
- Do not store uploaded design assets on the filesystem. Use the configured object storage in `lib/storage.ts`. The filesystem is ephemeral on most deployment targets.
- Do not call the Claude API directly from a route handler or server action for anything long-running. Analysis goes through the queue in `lib/queue.ts`, not an inline `await` — the one narrow, documented exception is the contextual assistant's streamed reply, see the Contextual Assistant section above.
- Do not let a stage of the AI pipeline write directly to the database without going through its Zod schema in `lib/ai/schemas.ts` first.
