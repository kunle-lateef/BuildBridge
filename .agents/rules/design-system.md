# Design System Rules

BuildBridge has its own visual language. It is built for professional designers and developers doing focused review work, not for a marketing site. The interface must feel calm, precise, and trustworthy, because the entire product is asking two people who don't fully trust an AI's read on a design to rely on it anyway. Every visual choice either earns that trust or spends it.

> **Source of truth:** every CSS custom property below is generated from BuildBridge's Figma token export (`tokens/color-tokens.tokens.json`, `tokens/typography-tokens.tokens.json`, `tokens/spacing-border-radius.json`) into `tokens/tokens.css` via `node tokens/generate-tokens.js`. Never hand-edit `tokens.css` — it's regenerated wholesale from those JSON files. If the Figma export changes and `tokens.css` is regenerated, update this document's names and values to match it, not the other way around. The Detected/Inferred provenance tokens below are the one exception to "Figma is the source" for now — they were added directly to `color-tokens.tokens.json` with the developer's approval (see the Color semantics table) because no Figma-exported value existed yet; reconcile them with a real Figma export whenever one becomes available.

## Design Principles

**Calm over decorative.** The product should read as a professional collaboration tool, not a marketing site. Visual flourishes support comprehension; they never exist to impress.

**Trust is a visual property, not just a data property.** Provenance (Detected/Inferred/Suggested) and confidence must be distinguishable at a glance, not only in a tooltip — color, iconography, and typographic weight all carry meaning consistently.

**One canonical severity and review-status system.** `Critical/High/Medium/Low/Recommendation` and `Unreviewed/Confirmed/Modified/Rejected/Resolved` each get one fixed mapping used everywhere — dashboard, review screen, developer view, share link. No per-screen reinvention.

**Progressive disclosure over density.** Default views show what matters; detail is one interaction away, not all present at once.

## Color System

Light mode only for MVP. Dark mode is explicitly out of scope for this release.

### Neutral & brand tokens

```css
--color-background: #F8FAFC;     /* app background */
--color-surface: #F1F5F9;        /* surface / card background; also the shared background for Unreviewed/Open/InReview (paired with text-secondary) and Rejected/Dismissed (paired with text-dismissed) */
--color-border: #E2E8F0;         /* borders, dividers */
--color-text-muted: #94A3B8;     /* placeholder / disabled text */
--color-text-dismissed: #64748B; /* Rejected/Dismissed label text, paired with strikethrough */
--color-text-secondary: #475569; /* secondary text; also Unreviewed/Open/InReview status text */
--color-text-body: #1E293B;      /* primary body text */
--color-text-primary: #0B0F19;   /* headings, high-emphasis text */

--color-primary: #4F46E5;              /* primary accent — buttons, links, focus rings. Never used for severity/status meaning. */
--color-primary-light: #E0E7FF;        /* Modified review-status background */
--color-primary-dark: #4338CA;         /* Modified review-status text */
--gradient-primary: linear-gradient(180deg, #6366F1 0%, #433BCA 100%); /* CTA buttons only — never on backgrounds, cards, or severity/status colors. Note the dark stop (#433BCA) is one digit off --color-primary-dark (#4338CA) in the Figma export — both read as the same near-black indigo; treat as a known source-file quirk, not something to "fix" by hand here. */
```

Naming note: `--color-text-primary` is the *highest*-emphasis text role (headings), and `--color-text-body` is regular body copy — this inverts the "primary = biggest/first" intuition, but it's what the generated tokens call them, so match it exactly rather than renaming for what reads more natural.

### Severity & status hue tokens

Every pairing below is a **pale-tint background + darkened text of the same hue** — never a saturated fill with white text. This is a deliberate accessibility choice: light-background/dark-text reliably clears WCAG AA (4.5:1) regardless of hue, whereas a saturated fill with white text does not (amber and orange especially would fail that way).

Unlike the neutral/brand tokens, severity and status don't get their own dedicated `--color-severity-*`/`--color-status-*` custom properties — they're expressed by pairing the semantic role tokens below. Compose them exactly as listed; don't invent a shorter alias.

```css
/* Severity */
--color-error-light: #FEE2E2;          --color-error: #B91C1C;          /* Critical */
--color-severity-high-light: #FFEDD5;  --color-severity-high: #C2410C;  /* High */
--color-warning-light: #FEF3C7;        --color-warning: #92400E;        /* Medium — darker than the other hues on purpose: amber-700 alone doesn't clear AA against amber-100 the way the other hues' 700-level text does */
--color-info-light: #DBEAFE;           --color-info: #1D4ED8;           /* Low / also used for "Recommendation" */

/* Review status (ReviewStatus and IssueStatus both reuse these — see Color semantics, below, for which enum uses which) */
--color-surface: #F1F5F9;              --color-text-secondary: #475569; /* Unreviewed, Open, and InReview */
--color-success-light: #DCFCE7;        --color-success: #15803D;        /* Confirmed (ReviewStatus) and Resolved (both enums) */
--color-primary-light: #E0E7FF;        --color-primary-dark: #4338CA;   /* Modified (ReviewStatus only) */
--color-surface: #F1F5F9;              --color-text-dismissed: #64748B; /* Rejected (ReviewStatus) and Dismissed (IssueStatus) — + strikethrough, never a saturated hue */
--color-ai-suggested-light: #EDE9FE;   --color-ai-suggested: #6D28D9;   /* Suggested / AI-only — deliberately not the primary-accent color */

/* Provenance (Detected/Inferred) — added in Phase P0b with the developer's
   approval; not yet Figma-sourced, see the note at the top of this file. */
--color-detected-light: #CCFBF1;       --color-detected: #0F766E;       /* Detected — teal, distinct from every severity/status hue */
--color-inferred-light: #E0F2FE;       --color-inferred: #0369A1;       /* Inferred — sky blue, distinct from Detected and from --color-info */
```

### Color semantics — what maps to what

Four different enums drive badge color in this app. They're split out below by type — rather than flattened into one list — so a missing value is visible by inspection instead of something you'd only catch by cross-checking the schema.

**`ProvenanceType`** — drives `ProvenanceBadge`:

| Value | Tokens |
|---|---|
| Detected | `--color-detected-light` / `--color-detected` |
| Inferred | `--color-inferred-light` / `--color-inferred` |
| Suggested | `--color-ai-suggested-light` / `--color-ai-suggested` |

**`IssueSeverity`** — drives `SeverityBadge`:

| Value | Tokens |
|---|---|
| Critical (blocks "Ready" regardless of numeric score) | `--color-error-light` / `--color-error` |
| High | `--color-severity-high-light` / `--color-severity-high` |
| Medium | `--color-warning-light` / `--color-warning` |
| Low / Recommendation | `--color-info-light` / `--color-info` |

**`ReviewStatus`** — drives `ReviewStatusBadge` (`Component`/`Specification`/`ComponentState`/`ResponsiveRule`):

| Value | Tokens |
|---|---|
| Unreviewed | `--color-surface` / `--color-text-secondary` |
| Confirmed | `--color-success-light` / `--color-success` |
| Modified | `--color-primary-light` / `--color-primary-dark` |
| Rejected | `--color-surface` / `--color-text-dismissed` (+ strikethrough) |
| Resolved | `--color-success-light` / `--color-success` (same pair as Confirmed) |

**`IssueStatus`** — also rendered by `ReviewStatusBadge`, passed `HandoffIssue`'s status instead of a finding's `ReviewStatus`. It's a distinct enum with a distinct value set (`Dismissed` isn't a `ReviewStatus` value; `Modified` isn't an `IssueStatus` value) — the component is shared because the visual pattern is identical, not because the two concepts are the same. Pass the enum's actual value straight through; don't translate it to the other enum's spelling to reuse a code path:

| Value | Tokens |
|---|---|
| Open | `--color-surface` / `--color-text-secondary` (same pair as Unreviewed — following this table's existing reuse pattern for "nothing has happened to this yet" states; not an explicit design decision, so confirm with the developer if Open should read differently from Unreviewed) |
| InReview | `--color-surface` / `--color-text-secondary` (same pair as Open/Unreviewed) |
| Resolved | `--color-success-light` / `--color-success` (same pair as `ReviewStatus`'s Resolved) |
| Dismissed | `--color-surface` / `--color-text-dismissed` (+ strikethrough — same pair as `ReviewStatus`'s Rejected) |

Severity, provenance, and review/issue status are independent concepts and must never share a color family — a Critical issue and a Rejected finding should never look alike. Color is never the only signal: every badge pairs with an icon and/or label text.

**A resolved or dismissed HandoffIssue is visually deprioritized, not just re-labeled.** Move it out of the primary issue list (or visibly mute/collapse it) rather than leaving it in place with only its badge color changed.

## Typography

| Typeface | Role | Use |
|---|---|---|
| Inter (variable font) | Primary UI/body typeface | All interface text except measured values — page titles, headings, labels, body copy, buttons. Fall back to the system sans-serif stack so text is never blank while the font loads. |
| JetBrains Mono | Monospace / measured-value typeface | Reserved specifically for extracted specification values and code — dimensions, hex codes, px/rem units (e.g., `48px`, `#1A1A1A`). Never used for prose, labels, or AI recommendation text. |

**Type scale.** `tokens/tokens.css` generates the full scale as `--font-{breakpoint}-{role}-{weight}-{size|weight|line-height|letter-spacing}` (e.g. `--font-desktop-heading-2-semi-bold-size`), for three breakpoints (`desktop`/`tablet`/`mobile`) and, per breakpoint, these roles in descending emphasis: Display XL (desktop only) → Display → Heading 1–4 → Body → Body Small → Caption → Overline (uppercase, wide letter-spacing) → Button → Label — each in four weights (regular/medium/semi-bold/bold). Read exact pixel values from `tokens.css` rather than hand-deriving them here; it regenerates from Figma and this document doesn't attempt to mirror every value.

`--font-family-base` (Inter) is the only typeface token `tokens.css` currently generates. There's no `--font-family-mono` token yet — apply JetBrains Mono directly (e.g. a Tailwind `font-mono` configured to it) until a monospace role is added to the Figma export and regenerated through.

**Weight, not just size, carries hierarchy.** AI-generated Suggested or Inferred content must never be set in a heavier weight than Confirmed content — visual weight implies certainty, and reversing that would contradict the trust model. Caption/metadata size is reserved for provenance labels, timestamps, and confidence indicators.

## Spacing

A 4px-based spacing scale (`tokens/tokens.css`'s `--spacing-*` tokens — `--spacing-1` = 0.25rem/4px up through `--spacing-96`, plus half-steps like `--spacing-1-5`), applied uniformly across padding, margins, and gaps. Be generous with whitespace, especially on the developer handoff view — it's the highest-stakes, most information-dense surface, so density should come from structure (Overview → Screens → Components → …), not from cramming.

## Shape, Elevation & Borders

`tokens/tokens.css` generates a full `--radius-*` scale (`none`/`xs`/`sm`/`md`/`lg`/`xl`/`2xl`/`3xl`/`full`); cards, buttons, and inputs stick to `--radius-sm`/`--radius-md`/`--radius-lg` — no per-component ad hoc radii, and no reaching for the larger steps outside of avatars/pills. Borders use the generated `--border-width-*` scale and are preferred over heavy shadows for separating content; shadow is reserved for true overlays (modals, dropdowns) so it retains meaning ("this is floating above the page"). Minimal, purposeful elevation — avoid stacked/skeuomorphic card-on-card effects.

## Components

Primitives live in `components/ui/`. Compose them, do not replicate them.

### Button

Filled primary uses `--color-primary`; the CTA gradient (`--gradient-primary`) is reserved for the highest-intent primary actions only — "Create Handoff," "Share Handoff" — never used for anything else, and never for a card, background, or status indicator.

### ProvenanceBadge

BuildBridge-specific primitive. Renders a finding's `ProvenanceType` (Detected / Inferred / Suggested) using the `ProvenanceType` token pairs above. This is the single component every other part of the UI should use to show provenance — never hand-roll a colored `<span>` for this.

### SeverityBadge

Renders a `HandoffIssue`'s `IssueSeverity` using the `IssueSeverity` token pairs above, always paired with an icon (never color alone).

### ReviewStatusBadge

Renders either a finding's `ReviewStatus` (`Unreviewed | Confirmed | Modified | Rejected | Resolved`) or a `HandoffIssue`'s `IssueStatus` (`Open | InReview | Resolved | Dismissed`) using the token pairs in Color semantics, above — one component for both enums, since the visual pattern (pale-tint pair, strikethrough on the negatively-closed value) is identical even though the enums themselves are distinct and don't share every value. This is a distinct component from `ProvenanceBadge` and a distinct enum from `ProvenanceType` — "how was this generated" (provenance) and "what state is this finding/issue in" (review/issue status) are two different questions and must never be collapsed into one badge. `Rejected` and `Dismissed` both render with strikethrough, per the token table.

### ReadinessScore

Displays the numeric percentage together with its hard-gate state (e.g., "62% — Not ready: 1 critical issue unresolved") — never the percentage alone, since a high percentage with an unresolved Critical issue must never read as "ready."

### Card

Rounded corners, subtle border, no drop shadow by default — add shadow only when a card needs to float above a busy background (modals, dropdowns).

### Input

Label sits above the input, not inside it. Error messages appear below the input using the severity "Critical" text token (`--color-error`), with a small icon. Focused state uses a `--color-primary`-colored ring.

## Developer Handoff View Layout

This is the most important page in the product — the moment a developer's trust in BuildBridge is made or broken. Structure it exactly as: Overview → Screens → Components → Specifications → Interactions → Responsive Behavior → States → Edge Cases → Implementation Notes. Every section must visually distinguish designer-confirmed information from AI-detected information from AI recommendations from unresolved questions — never collapse that distinction for the sake of a cleaner layout.

## Dashboard Layout

A single-column list of handoffs with status and readiness score, sortable/filterable, is the **default** view — it stays the default because it's still the easier scan for a status/score-only row. That MVP premise no longer holds unconditionally now that a row can carry richer signal (issue counts, open developer flags, a screen thumbnail): a visual card/grid view is allowed as an **opt-in** toggle alongside the list (e.g. a `view` URL param), never as a replacement for the single-column default and never forced on load. The rule this amends was "do not build a multi-column dashboard for MVP" — read it now as "never make the default view harder to scan," not "never offer an alternative one."

## Iconography

Lucide is the committed icon library — a single, consistent stroke-style set used end-to-end. Icons always carry an accessible label via `aria-label` or adjacent visible text; never rely on an icon alone to convey severity or status.

## Motion

Motion is functional only — state transitions, loading indicators, expand/collapse. No decorative animation, no page transitions. Respect `prefers-reduced-motion`.

## Accessibility

Every interactive element is reachable by keyboard, with a visible focus state using `--color-primary`. Color contrast meets WCAG AA — this is why the severity/status tokens use the pale-tint-background/dark-text pattern rather than saturated fills. Form inputs have associated labels; error messages are linked via `aria-describedby`. Images have `alt` text.

## Logo & Brand Assets

`public/logo/` holds two sets of four files:

- `buildbridge-logo*.svg` / `buildbridge-logo-white*.svg` — the full icon+wordmark **lockup**, `viewBox="0 0 650 100"` (6.5:1), with "BuildBridge" baked in as real SVG `<text>`. This is what `components/ui/BrandMark.tsx` actually uses — it treats `size` as height only and derives width from the 6.5:1 ratio, rather than forcing it into a square (which crushes the wordmark to a sliver — a real bug hit and fixed once already, don't reintroduce it).
- `buildbridge-icon*.svg` / `buildbridge-icon-white*.svg` — the icon glyph only, `viewBox="0 0 100 100"` (the lockup's first 100 units, text dropped), for any context that wants the mark without the wordmark. Not currently referenced by `BrandMark`; kept as a ready-made alternative rather than something to regenerate if this choice changes again.

Each set has a Desktop and Mobile cut, and a dark-on-light (`buildbridge-logo*`) / light-on-dark (`buildbridge-logo-white*`, for `--color-primary`/`--color-primary-dark`/gradient backgrounds) variant. Never reference these paths directly — use `BrandMark`, which renders both cuts and toggles visibility at the `sm` breakpoint so the right one shows without a client component. The repo-root `Desktop logo/` and `Mobile logo/` folders, if present, are design-handoff drops, not app assets — don't import from them.

## What Not to Do

- Do not add a new color without checking whether an existing token already covers the need — the palette is intentionally small.
- Do not use a saturated fill + white text for any severity or status badge. Use the pale-tint pattern, always.
- Do not build dark mode. It's explicitly out of scope for this release.
- Do not set Suggested or Inferred content in a heavier font weight than Confirmed content.
- Do not use monospace for anything other than measured/extracted values.
- Do not mix icon libraries.
- Do not build the developer handoff view with anything less than full provenance visibility — that's the product, not a nice-to-have.
