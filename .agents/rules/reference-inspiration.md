# Reference Inspiration Rules

This file records what BuildBridge learned from five reference products, and — more importantly — what it deliberately did *not* borrow from them. It exists so that no future agent re-derives these decisions from scratch, and so that no future agent "helpfully" reaches back toward a reference's actual visual or interaction language because it seems familiar or convenient.

**The references are teachers, not templates.** Every pattern below has already been through the translation: Reference Pattern → Underlying Principle → BuildBridge User Need → Original BuildBridge Implementation. Do not go back to a reference product for visual details, spacing, color, or interaction choreography. If a task seems to call for that, it doesn't — build from `design-system.md` and the patterns below instead.

If a reference conflicts with `AGENTS.md`, `architecture.md`, `code-style.md`, `security.md`, or `design-system.md`, **ignore the reference.** This file is subordinate to all four other rule files.

## Why BuildBridge has three distinct surfaces, not one shell

BuildBridge does not borrow a single unified "app shell" from any one reference. It has three surfaces, each solving a genuinely different user task, each earning a different reference's underlying principle:

1. **Dashboard** (list of handoffs) — Vercel's summary-then-drilldown discipline + Linear's restraint.
2. **Review workspace** (inside a Handoff, designer-facing) — Cursor's progressive AI-observability pattern while analysis runs, transitioning into Figma-Dev-Mode-honoring property inspection once complete.
3. **Developer handoff view** (share link) — Notion's document hierarchy.

Do not try to unify these into one shared shell "for consistency." The tasks are different (skim a list; watch and judge an in-progress interpretation; read a finished reference document), and the composition should stay different. What *is* shared across all three, and must never be dropped for the sake of a cleaner layout, is the provenance/decision layer — none of the five references below have any equivalent of it, and it is BuildBridge's actual differentiation, not a visual choice.

## 1. Linear — application-shell restraint

**Borrow:** Color reserved strictly for status meaning, never decorative. Typography-led hierarchy (weight/size) over boxes and borders. Minimal chrome. Visible keyboard focus.

**Do not borrow:** Linear's core IA — a persistent multi-entity sidebar for moving between many peer entities (teams → projects → issues). BuildBridge's unit of work is one Handoff at a time, drilled into internally, not a workspace of many peer entities. There is no team/project switcher in BuildBridge because there is no such entity. The dashboard stays a flat single column (already specified below and in `design-system.md`); inside a Handoff, navigation is the fixed section hierarchy, not an issue-list-with-filters model.

## 2. Cursor — AI agent transparency

**Borrow:** Long-running AI work is shown as discrete, itemized, checkable stages in progress — never a bare spinner or a single "Analyzing…" state.

**BuildBridge-specific component this produces:** an **Analysis Progress panel** (`components/review/AnalysisProgressPanel.tsx` — not yet in the phase-by-phase file list; add it to P0a.3/P0a.4's file list when that work starts) mapped 1:1 to the five documented pipeline stages from `architecture.md`. Each row shows domain-specific counts in BuildBridge's own vocabulary — "14 components detected," "7 interaction states identified — 5 Suggested" — never generic phrasing like "found 7 items." Each completed row surfaces its Detected/Inferred/Suggested split inline. This is the one place BuildBridge goes further than Cursor: Cursor has no provenance taxonomy to show, BuildBridge's entire value proposition is provenance, so the progress panel earns its keep by showing trust distribution while work is still in flight, not just after.

**Do not borrow:** Chat-bubble UI, "typing" animation, inline diff-view visual language. BuildBridge is not a chatbot and shows design findings, not code changes — the contextual AI assistant (P2) is explicitly scoped away from an open-domain chat experience in `AGENTS.md` and must not adopt Cursor's chat-thread-as-primary-interface model.

## 3. Figma Dev Mode — inspection precision (highest scrutiny)

Dev Mode gets the highest originality bar of the five references — it is the closest thing to a direct competitor in spirit, even though `AGENTS.md` explicitly rules out being a Figma replacement.

**Borrow:** The *expectation*, not the mechanism — developers already expect to get exact, implementable property values from a design without asking the designer. Honor that expectation.

**Do not borrow:** The canvas-plus-inspector-panel model. BuildBridge has no canvas — uploaded screens are flattened images, not editable vector layers, and BuildBridge is not a spatial tool. No zoom/pan surface, no code-snippet tabs, no hover-measurement redlines, no selection-gated inspection ("click a layer to see its values").

**Original BuildBridge model:** Property inspection is **document-native content**, not a floating panel triggered by canvas selection. A Button's spec block reads "Height — 48px [Detected]" inline in running document flow (`SpecificationRow.tsx`, `ComponentReviewCard.tsx`), always visible, never a hover-reveal. This is the structural answer to what the product brief calls the competitive wedge: Figma answers "what are the specs" from a position of authority (the design file *is* the source of truth); BuildBridge must additionally answer "what's missing, what's implied, what needs a decision, what's confirmed" for every single property, because BuildBridge is an interpretation of the design, not the design itself. That difference in epistemic status is exactly why the inspection UI cannot be a copy of Dev Mode's — Dev Mode has no reason to express uncertainty about a value; BuildBridge frequently must.

## 4. Vercel — technical information density (supporting reference)

**Borrow:** Summary-tier cards → progressive drill-down into full tables/logs. This is a structural principle for the dashboard and per-handoff status data (analysis history, quota usage, screen/component counts, per-stage timing, readiness history).

**Already independently decided, not new from this reference:** reserving monospace (JetBrains Mono) for measured/technical values vs. Inter for everything else — `design-system.md` already mandates this. Vercel validates the decision; it did not originate it here.

**BuildBridge must go further than Vercel:** Vercel's metrics are objectively true (a failed deployment is failed). BuildBridge's are not (a "Suggested" finding is not objectively wrong). A summary card can never compress away the Confirmed/Inferred/Suggested distinction the way a metrics card compresses p50/p95 latency into one number. This is why `ReadinessScore` must always show the hard-gate state alongside the percentage (see `design-system.md`) — a requirement Vercel's dashboard never has to solve, because nothing in it is simultaneously "quantified" and "uncertain."

**Do not borrow:** Vercel's black/white high-contrast brand system, its deployment-timeline visualization, its specific card/border treatment.

## 5. Notion — documentation layer (supporting reference)

**Borrow:** Hierarchical, nested document sections with inline properties, read as a coherent living document rather than a database dump. This is already effectively mandated — `design-system.md`'s fixed developer-handoff section order (Overview → Screens → Components → Specifications → Interactions → Responsive Behavior → States → Edge Cases → Implementation Notes) is already Notion-shaped, which is why Notion is the right reference rather than a card-dashboard approach.

**Do not borrow:** Notion's editable-block/slash-command authoring model, its toggle-disclosure triangle styling, its comment/discussion-thread UI. The developer handoff view is **read-only by architecture** (`architecture.md`: server-rendered, no client-side fetch, viewable by a possibly-anonymous developer) — there is no editing chrome to design at all. This is a structural difference from Notion, not a stylistic one; do not add inline-editing affordances to `app/share/[token]/` under any circumstance.

**BuildBridge goes further than Notion:** every content block carries a dimension Notion has no equivalent for. A "Hover state" row is never plain text the way it would be in a Notion doc — it is always paired with its `ProvenanceBadge`/`ReviewStatusBadge`, per `component-builder/SKILL.md`'s mandatory-visible-badge rule.

## Design Distance Test — apply before shipping any reference-inspired screen

Before considering a reference-inspired component or screen done, check:

1. Would a reasonable user mistake it for the reference product?
2. Does the overall composition strongly resemble the reference?
3. Are several of the reference's *distinctive* patterns being reproduced together (not just one generic one)?
4. Is the same hierarchy, navigation, component set, and interaction choreography being combined the way the reference combines them?
5. Does the screen feel like a reskin — same structure, different colors/text/icons?
6. Would swapping the logo make it read as the reference product?

If the answer to any of these is meaningfully "yes," stop and redesign with more distance. The synthesis above (three distinct surfaces, provenance woven through every content unit) is what makes the "no" answer hold — do not erode it by pulling in a reference's specific layout because it's expedient for one screen.

## What Not to Do

- Do not go back to a reference product's live UI for spacing, color, or component styling "just to check." Every generic principle worth taking has already been extracted above; everything else is the reference's proprietary expression.
- Do not add a command palette, chat-bubble interface, canvas/inspector-panel, or inline-editing chrome to BuildBridge because a reference has one — none of these fit BuildBridge's actual architecture (see the per-reference "Do not borrow" notes above) and none were approved as in-scope.
- Do not unify the three surfaces (dashboard / review workspace / developer handoff view) into one shared shell for the sake of visual consistency — their compositions are intentionally different because the underlying tasks are different.
- Do not build a property/spec row, an AI-status indicator, or a document section without its provenance/review-status badge just because the reference version of that pattern doesn't have one. That badge is the entire point of building this instead of using the reference product.
- Do not treat this file as exhaustive design guidance — it explains *why* certain reference-derived decisions were made and where the boundaries are. `design-system.md` remains the source of truth for actual tokens, components, and layout specifics.
