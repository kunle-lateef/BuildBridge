# DB Migration Runner Skill

Load this skill for any task that changes `prisma/schema.prisma`. Do not write a migration from memory or improvise the schema shape — the logical data model below is the source of truth for what the domain looks like, and Prisma's schema must always stay a faithful, versioned implementation of it, never a shortcut around it.

## The Logical Data Model

Field types below are illustrative, not binding to a specific Postgres type — pick the right Prisma type when implementing (e.g., `String`, `Int`, `DateTime`, `Json`), but the field names, relationships, and enum values are fixed — except where a field is explicitly flagged below as not yet defined; those are genuinely open, not just unwritten.

### User
| Field | Notes |
|---|---|
| id | PK |
| name | |
| email | unique |
| avatar | optional |
| passwordHash | Added in Phase 0 — the developer chose Auth.js Credentials (email + password) as the sign-in method, which this logical model didn't originally account for. bcrypt hash only, never the plaintext password; see `security.md`. |
| sessionVersion | Added in Phase 0 — NextAuth's Credentials provider requires JWT-strategy sessions (a library constraint), which have no server-side session table to revoke from on logout. Incrementing this value invalidates every previously issued JWT, which is what makes `security.md`'s "logout invalidates the session on the server side" rule hold under Credentials auth specifically. |
| planTier | `Free \| Paid` (extendable — quota/plan logic is detailed in `.agents/skills/api-route-scaffolder/SKILL.md`) |
| analysisQuota | included AnalysisRuns per current billing cycle |
| analysisUsageCount | AnalysisRuns consumed in the current cycle (deduplicated/reused analyses do not increment this) |
| billingCycleStart | anchor date for the rolling monthly quota window |
| createdAt / updatedAt | |

### Handoff
| Field | Notes |
|---|---|
| id | PK |
| ownerId | FK → User |
| name, description | |
| status | `Draft \| Analyzing \| NeedsReview \| Ready \| Shared \| Archived` |
| readinessScore | derived, cached, recalculated on relevant change |
| readinessAlgorithmVersion | which scoring rubric version produced the cached score, so future rubric changes don't silently make historical scores incomparable |
| createdAt / updatedAt | |

### DesignAsset
| Field | Notes |
|---|---|
| id, handoffId | |
| filename, mediaType, size | |
| storageReference | pointer, not raw content |
| checksum | dedupe/integrity — this is what the AI pipeline's cost-reuse logic matches on |
| processingStatus | `Uploaded \| Processing \| Processed \| Failed \| Deleted` |
| createdAt | |

### Screen
| Field | Notes |
|---|---|
| id, handoffId, assetId | |
| name, order | |
| dimensions | |
| analysisStatus | **Not yet defined** — no enum values are specified anywhere in this corpus. Ask the developer before adding this field to the schema; don't invent values. (Given `AnalysisRunStatus` exists at the run level, this is plausibly a per-screen echo of it — e.g. `Pending \| Analyzing \| Analyzed \| Failed` — but that's a guess, not a confirmed spec.) |
| createdAt / updatedAt | |

### AnalysisRun
| Field | Notes |
|---|---|
| id, handoffId | |
| status | `Queued \| Processing \| Completed \| PartiallyCompleted \| Failed` |
| modelIdentifier, analysisVersion | for traceability |
| startedAt, completedAt, errorCode | |
| *(immutable historical record — see the special rule below)* | |

### Component
| Field | Notes |
|---|---|
| id, handoffId | |
| name, type, description | |
| confidence, provenance | `Detected \| Inferred \| Suggested` |
| reviewStatus | `Unreviewed \| Confirmed \| Modified \| Rejected \| Resolved` |
| createdAt / updatedAt | |

### ComponentInstance
| id, componentId, screenId, regionReference, dimensions, properties |
|---|

### Specification
| Field | Notes |
|---|---|
| id | |
| screenId or componentId | |
| category | spacing, typography, color, dimensions, border, radius, shadow |
| property, value, unit | |
| confidence, provenance, reviewStatus, sourceReference | |

### ComponentState
| id, componentId, name (Default/Hover/Focus/Disabled/Loading/Error/Empty), description, status, provenance, confidence, reviewStatus |
|---|

**Note:** `status` here is distinct from `reviewStatus` and its meaning isn't documented anywhere in this corpus — confirm with the developer whether it's an intentional third dimension or a leftover before building against it.

### ResponsiveRule
| id, screenId or componentId, viewportCategory, behavior, confidence, provenance, reviewStatus |
|---|

### HandoffIssue
| Field | Notes |
|---|---|
| id, handoffId, screenId, componentId | |
| title, description | |
| severity | `Critical \| High \| Medium \| Low \| Recommendation` |
| category, recommendation | |
| status | `Open \| InReview \| Resolved \| Dismissed` |
| provenance, confidence | |
| createdAt / updatedAt | |

### DesignerDecision
| Field | Notes |
|---|---|
| id, handoffId, findingType, findingReference | `findingType` is the discriminator (`Component \| Specification \| ComponentState \| ResponsiveRule \| HandoffIssue`) — it says which table `findingReference` points into. Without it the reference can't be resolved; a bare ID alone doesn't say which of the five finding tables to look in. |
| action | `Confirm \| Modify \| Reject \| Override` |
| previousValue, newValue, note | |
| createdBy, createdAt | |

### DesignerNote
| id, handoffId, screenId, componentId, content, createdBy, createdAt / updatedAt |
|---|

### ShareLink
| id, handoffId, tokenReference, status, expiresAt, createdAt, revokedAt |
|---|

**Note:** `status`'s enum values aren't defined anywhere in this corpus. `security.md` implies at least `Active` (it says to "verify `status` is active") and `Revoked` (paired with the `revokedAt` field) exist, but whether `Expired` is a third stored value or purely computed from `expiresAt` vs. now is unconfirmed — ask the developer before implementing rather than guessing.

### AIConversation / AIMessage
| AIConversation: id, handoffId, createdBy, createdAt/updatedAt |
| AIMessage: id, conversationId, role, content, citations/references, createdAt |
|---|

**Note:** `AIMessage.role`'s enum values aren't defined anywhere in this corpus either. `User \| Assistant` (possibly `System`) is the conventional shape for a chat-message role, but confirm the exact set with the developer before implementing — don't assume the convention is the spec.

### Relationships (summary)
```
User 1—* Handoff
User 1—* DesignerDecision, DesignerNote, AIConversation    (via createdBy)
Handoff 1—* DesignAsset, Screen, Component, HandoffIssue,
           DesignerNote, DesignerDecision, AnalysisRun,
           ShareLink, AIConversation
DesignAsset 1—* Screen                              (Screen.assetId)
Component 1—* ComponentInstance, ComponentState
Screen 1—* ComponentInstance                        (ComponentInstance is scoped by both Component and Screen)
Screen/Component 1—* Specification, ResponsiveRule
Screen/Component 1—* DesignerNote, HandoffIssue      (screenId/componentId on these are optional scoping FKs, not required)
AIConversation 1—* AIMessage
```

**Design principle:** the schema is stable independent of database technology; `provenance` and `reviewStatus` fields exist on nearly every AI-generated entity so trust state is never implicit.

## Before You Touch the Schema

**Step 1. Cross-check against the model above.** If the field or entity you need already exists there, match it exactly — same name, same enum values. If it doesn't exist there, that's a signal to pause: either the model above needs updating (ask the developer, and update this file once agreed) or the field belongs somewhere else — implementation detail that doesn't need to be in the logical model, like an internal index.

**Step 2. Match naming conventions exactly** (see `code-style.md`):
- Models: `PascalCase` singular — `Handoff`, `Screen`, `Component`, `Specification`, `HandoffIssue`, `DesignerDecision`, `ShareLink`.
- Columns: `camelCase` in the Prisma client, mapped from `snake_case` in the database via `@map`.
- Enums match the vocabulary in the logical data model above, exactly:
  - `HandoffStatus`: `Draft | Analyzing | NeedsReview | Ready | Shared | Archived`
  - `AssetProcessingStatus`: `Uploaded | Processing | Processed | Failed | Deleted`
  - `AnalysisRunStatus`: `Queued | Processing | Completed | PartiallyCompleted | Failed`
  - `ProvenanceType`: `Detected | Inferred | Suggested`
  - `ReviewStatus`: `Unreviewed | Confirmed | Modified | Rejected | Resolved`
  - `IssueSeverity`: `Critical | High | Medium | Low | Recommendation`
  - `IssueStatus`: `Open | InReview | Resolved | Dismissed`
  - `DesignerDecisionAction`: `Confirm | Modify | Reject | Override`
  - `FindingType`: `Component | Specification | ComponentState | ResponsiveRule | HandoffIssue`
  - `PlanTier`: `Free | Paid`
  - `ReadinessCategory`: `VisualSpecifications | Components | ResponsiveBehavior | InteractionStates | EdgeCases | Accessibility` — added in Phase 0, not originally in this list. The six category names are unambiguous (identical wording in `architecture.md`'s readiness formula and the product prompt), and `lib/readiness.ts`'s correctness depends on exact matching, so `HandoffIssue.category` is this enum rather than a free-text field.
  - `SpecificationCategory`: `Spacing | Typography | Color | Dimensions | Border | Radius | Shadow` — added in Phase 0, same reasoning (unambiguous set named in `architecture.md`'s pipeline stage 2).
  - `ComponentStateName`: `Default | Hover | Focus | Disabled | Loading | Error | Empty` — added in Phase 0, same reasoning (`architecture.md`'s pipeline stage 3).
  - `ViewportCategory`: `Desktop | Tablet | Mobile` — added in Phase 0, same reasoning (`architecture.md`'s pipeline stage 4).
  - `ScreenAnalysisStatus` (`Screen.analysisStatus`): `Pending | Analyzing | Analyzed | Failed` — Phase 0's proposed default per the approved implementation plan. Confirm with the developer before Phase P0b needs a per-screen indicator; not a final decision yet.
  - `ShareLinkStatus` (`ShareLink.status`): `Active | Revoked` — Phase 0's proposed default per the approved implementation plan ("expired" is computed from `expiresAt`, not a stored third value). Confirm with the developer at Phase P1a; not a final decision yet.
  - `AIMessageRole` (`AIMessage.role`): `User | Assistant` — Phase 0's proposed default per the approved implementation plan. Confirm with the developer before Phase P2; not a final decision yet.

Do not invent a synonym for any of these. The same word has to mean the same thing in the database, the Zod schema, the API response, and the UI copy.

## Special Rules for This Schema

**`AnalysisRun` is append-only.** It's an immutable historical record per `architecture.md`. A migration that adds an `UPDATE` or `DELETE` path to existing `AnalysisRun` rows (outside of the app's own status-transition logic during a run's lifecycle) is almost certainly wrong — stop and ask the developer before writing it.

**Readiness and analysis versioning are deliberate, not incidental.** `Handoff.readinessAlgorithmVersion` and `AnalysisRun.analysisVersion` exist specifically so historical scores/results stay explainable when the underlying formula or AI pipeline changes. If a migration changes the shape of data the readiness formula reads, or changes the AI pipeline's output schema, bump the corresponding version field's default/handling — don't just silently change what the number means.

**A `DesignerDecision` is a first-class audit record, not a convenience log.** Never write a migration that would allow deleting `DesignerDecision` rows in the normal application flow (a `Rejected` action, for instance, is itself a `DesignerDecision` — the record of the rejection is what stays, not a deletion of the finding).

**Provenance and reviewStatus are required, not optional, on every AI-generated entity.** `Component`, `Specification`, `ComponentState`, `ResponsiveRule`, and `HandoffIssue` all need `provenance` and `confidence` at creation, and most need `reviewStatus`. A migration that makes one of these nullable "to make seeding easier" is a bug — see `security.md`'s AI Output & Structured Data Trust section for why.

## Running the Migration

**Step 1.** Update `prisma/schema.prisma` with the change.

**Step 2.** Run `npx prisma migrate dev --name <descriptive-name>` locally against your dev database. Use a name that describes the change, not the ticket number — `add-issue-status-dismissed` not `fix-123`.

**Step 3.** Review the generated SQL in `prisma/migrations/`. Never hand-edit a generated migration file after it's been applied anywhere but your own local machine — if it's wrong, fix the schema and generate a new migration instead.

**Step 4.** If the change affects existing data (a new required column on a table with rows, a renamed column, a changed enum), write the data migration explicitly rather than trusting Prisma's default behavior. A required column with no default on an existing table will fail the migration outright — decide the backfill value deliberately.

**Step 5.** Update the corresponding Zod schema (in `lib/validators/` or `lib/ai/schemas.ts`) in the same commit. A schema change that isn't reflected in the matching Zod validator is a trust-boundary bug waiting to happen — the two must never drift apart.

**Step 6.** Test the migration against a fresh local database, not just an already-migrated one, to catch ordering issues.

## Common Mistakes

- Renaming a column without a data migration, silently losing existing values.
- Dropping a column that still has data referenced elsewhere in the app (check `app/`, `components/`, `lib/`, and `workers/` for usages before dropping anything — `app/` included, since server actions and page components reference fields directly).
- Making a `provenance`, `confidence`, or `reviewStatus` field nullable for convenience.
- Forgetting to update the matching Zod schema, so the app's runtime validation and the database schema silently diverge.
- Writing raw SQL outside of a migration file — see `architecture.md`'s Database Access rules.
- Adding an update/delete path to `AnalysisRun` rows.

## Resources in This Skill

- None yet. If a seed script or reference migration pattern is added later, it belongs in `resources/` in this folder.
