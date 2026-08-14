# AGENTS.md — BuildBridge

This file is the entry point for any AI agent working on the BuildBridge codebase in Antigravity, OpenCode, or any other AGENTS.md-compatible tool. Read this first, then load the rule files in `.agents/rules/` and the relevant skill in `.agents/skills/` before taking any action.

## What BuildBridge Is

BuildBridge is an AI-powered designer-to-developer handoff assistant. A designer uploads finished UI screens, BuildBridge analyzes them and identifies components, specifications, states, and responsive behavior, then surfaces what's missing or ambiguous as handoff issues. The designer reviews and confirms or corrects the AI's read. Only then does a developer see the result, through a scoped, read-only share link.

BuildBridge is not a design tool, not a code generator, and not a project-management suite. It is an interpretation layer that sits between "the design is done" and "development can start correctly." Every feature decision should be measured against the core workflow: **Upload → Analyze → Detect Gaps → Review → Resolve → Ready → Handoff.** If a proposed feature doesn't directly support that workflow, it's out of scope unless the developer explicitly approves it.

The single non-negotiable product principle: **AI should clarify design intent, not invent it.** AI analyzes, the designer validates, the developer consumes. An AI inference or suggestion must never be presented as a confirmed designer decision, anywhere in the product.

## Who We Are Building For

- **Designers** (primary) — finish screens elsewhere (usually Figma), upload them here, want confidence they haven't left gaps before handing off, don't want to hand-write a spec doc.
- **Developers** (primary) — receive the handoff, need to implement without back-and-forth, distrust tools that present guesses as facts, want a structured view organized by screen → component → spec/state/behavior.
- **Team leads** (secondary) — care about handoff quality and cycle time across a team, want a repeatable process.

Agents must keep the trust relationship between these personas in mind at all times. A developer who catches BuildBridge presenting an AI guess as a fact will stop trusting the whole product, not just that one finding.

## Tech Stack

- Next.js (App Router) with React and TypeScript, end-to-end
- PostgreSQL via Prisma
- Zod for structured-output and input validation everywhere data crosses a trust boundary
- Claude API (Anthropic), structured output via tool-use/JSON schema, for all AI analysis
- BullMQ (Redis-backed) for the asynchronous analysis pipeline
- S3-compatible object storage for uploaded design assets
- Provider-managed authentication (Auth.js or Clerk) — never hand-rolled
- Tailwind CSS for styling, driven by the design tokens in `design-system.md`
- Hosting: Vercel (app) + managed Postgres + managed Redis

See `.agents/rules/architecture.md` for the full rationale behind each of these choices.

## Project Structure

```
buildbridge/
├── AGENTS.md                       (this file)
├── .agents/
│   ├── rules/                      (always-on rules for every task)
│   │   ├── architecture.md
│   │   ├── code-style.md
│   │   ├── design-system.md
│   │   ├── reference-inspiration.md
│   │   └── security.md
│   └── skills/                     (load only when relevant to the task)
│       ├── component-builder/
│       ├── api-route-scaffolder/
│       └── db-migration-runner/
├── workflows/                      (step-by-step recipes for common tasks)
│   ├── new-component.md
│   └── new-api-route.md
├── tokens/                         (generated design-token source files — see design-system.md)
├── public/                         (static assets, logo)
├── app/
├── components/
├── lib/
├── workers/
└── prisma/
```

See `architecture.md` for what lives inside `app/`, `components/`, `lib/`, `workers/`, and `prisma/`.

## How to Use These Files

**Rules in `.agents/rules/` are always in effect.** Load all five before starting any task. They cover architecture decisions, code style, the design system, security requirements, and — for any UI/UX work — what BuildBridge learned from its reference products and, just as importantly, what it deliberately chose not to borrow from them. Do not override them without explicit permission from the developer.

**Skills in `.agents/skills/` are loaded on demand.** When building a UI component, read `.agents/skills/component-builder/SKILL.md` first. When creating a server action or route handler, read `.agents/skills/api-route-scaffolder/SKILL.md`. When changing the database schema, read `.agents/skills/db-migration-runner/SKILL.md`. Never skip the skill file and try to work from memory — the schemas, templates, and conventions they define are the source of truth, not whatever pattern feels familiar.

**Workflows in `workflows/` are recipes.** Follow them in order when the task matches. They chain the rules and skills into a concrete sequence of steps.

## Non-Negotiables

1. **AI output is never trusted until it's validated.** Every AI-generated structured result (Component, Specification, ComponentState, ResponsiveRule, HandoffIssue) is validated against its Zod schema before it touches the database or is shown to anyone. Invalid output is rejected, never silently stored.
2. **Provenance is never optional.** Every AI-generated finding carries a provenance type — Detected, Inferred, or Suggested — and that provenance must be visibly distinguishable in the UI, not just present in the data. Never render Suggested or Inferred content in a way that could be mistaken for a confirmed fact.
3. **A designer's decision is never silently overwritten.** If a new analysis run produces a result that conflicts with an existing `DesignerDecision`, the conflict is flagged for re-review. It does not auto-apply.
4. **The readiness score is deterministic and explainable.** It is computed from an explicit, versioned formula (see `architecture.md`), never inferred by a model call. If the formula changes, the version increments.
5. **Share links expose the developer view only.** A share link must never grant access to the designer review interface, other handoffs, or any data outside the single authorized handoff it was scoped to.
6. **Sensitive data lives in environment variables, never in the codebase.** API keys (Anthropic, storage, auth), database URLs, and webhook/session secrets are never committed, logged, or exposed to the client.
7. **The product stays narrow.** The following are explicitly out of scope for MVP — do not build any of them without the developer's explicit sign-off, even if a task seems to lead naturally toward one:
   - Full Figma integration or Figma plugin
   - Code generation
   - GitHub / Jira / Linear integration
   - Real-time multiplayer collaboration
   - Full design-system management
   - Automated design modification

   **Feature build order** (P0 items are hard dependencies; nothing later is usable without them):

   | Priority | Features | Why |
   |---|---|---|
   | P0 — build first | Authentication → Create Handoff → Upload Design/Screens → AI Design Analysis → Handoff Readiness Score (basic) | Nothing else is usable without an authenticated user, a project, an upload, and *some* analysis output. |
   | P0 — build second | AI Confidence Indicators → Handoff Gap Detection → Designer Review & Editing | The trust model is not optional polish — a handoff without provenance/review is just an unstructured AI dump. These ship *with*, not after, analysis. |
   | P1 — build third | Developer-Facing Handoff View → Shareable Handoff | Delivers value to the developer persona; the designer-side loop (P0) can be validated internally before this exists. |
   | P1 — build fourth | Dashboard → Designer Notes | Dashboard matters once a user has more than one handoff; Notes enhance review but aren't required for a single end-to-end pass. |
   | P2 — build last | Contextual AI Assistant | Highest incremental build cost, lowest dependency risk — the product is coherent without it at first launch. |

## When in Doubt

Ask the developer. Do not guess at the readiness formula, AI schema contracts, auth flows, or anything involving how designer decisions and AI output interact. Small guesses in those areas erode the one thing BuildBridge is actually selling: trust.
