# Component Builder Skill

Load this skill for any task that creates or modifies a React component in BuildBridge. It is the template and pattern reference so a new component fits the codebase instead of reinventing conventions that already exist — especially the provenance/severity display patterns that show up in a large fraction of the UI.

## What This Skill Does

It gives you the standard component shape, the variant-handling pattern, and — specific to BuildBridge — the pattern for any component that displays AI-generated content, since that's a recurring need across the dashboard, review screen, and developer handoff view. Do not build a one-off colored badge or a bespoke provenance indicator; use the shared primitives this skill defines.

## The Component Template

```tsx
import { cn } from '@/lib/cn';

type ComponentNameProps = {
  // required props first
  // optional props after
  className?: string;
};

export function ComponentName({ /* ...props */, className }: ComponentNameProps) {
  return (
    <div className={cn('base-classes-here', className)}>
      {/* ... */}
    </div>
  );
}
```

Named export, not default. `className` is always accepted and merged with `cn()`, never overwritten. Default to a server component; add `"use client"` only if the component actually needs state, effects, browser APIs, or real event handlers — if you're unsure, start without it and let TypeScript tell you if you need it.

## Variant Handling

If a component has variants (sizes, colors, styles), use `class-variance-authority` (`cva`). Do not stack conditional class strings by hand.

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva('inline-flex items-center justify-center rounded-md font-medium transition', {
  variants: {
    variant: {
      primary: 'bg-[--color-primary] text-white hover:opacity-90',
      secondary: 'bg-[--color-surface] text-[--color-text-body] border border-[--color-border]',
      ghost: 'bg-transparent text-[--color-text-body] hover:bg-[--color-surface]',
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});
```

## Provenance-Aware Components

This is the pattern most specific to BuildBridge and the one most worth getting right, since it's the visual expression of the whole product's trust model (see `design-system.md`).

**`ProvenanceBadge`** — the only component that should ever render a Detected/Inferred/Suggested indicator. It takes a `provenance: 'Detected' | 'Inferred' | 'Suggested'` prop and looks up the correct token pair from the design system rather than accepting a raw color. Never hardcode a color for provenance display anywhere else — always compose this component. All three variants have defined tokens as of Phase P0b — see `design-system.md`'s Color semantics table.

**`SeverityBadge`** — the same pattern for `HandoffIssue` severity (`Critical | High | Medium | Low | Recommendation`), always rendered with an accompanying icon, never color alone.

**`ReviewStatusBadge`** — the same pattern for a finding's `ReviewStatus` (`Unreviewed | Confirmed | Modified | Rejected | Resolved`) *and* a `HandoffIssue`'s `IssueStatus` (`Open | InReview | Resolved | Dismissed`) — one component, two distinct enums, since the visual pattern is identical; see `design-system.md`'s Color semantics table for which enum uses which token pair. Includes the strikethrough treatment for `Rejected`/`Dismissed`.

**Rule for any component that composes these:** if a component displays both a value and its provenance (e.g., a spacing value with its confidence level), the provenance badge is never optional or hidden behind a hover — it must be visible in the default state. This is a hard requirement, not a style preference; see `AGENTS.md`'s Non-Negotiables.

**Rule for AI-generated text content:** any component rendering free-text AI output (a recommendation, an inferred behavior description) must use the type-weight rule from `design-system.md` — Suggested/Inferred content is never set in a heavier weight than Confirmed content in the same view.

## Wiring Accessibility

- Interactive elements get a visible focus state (`focus-visible:ring-2 focus-visible:ring-[--color-primary]`).
- Icon-only buttons get `aria-label`.
- `ProvenanceBadge`/`SeverityBadge`/`ReviewStatusBadge` all carry an `aria-label` describing the state in words (e.g., `aria-label="AI suggestion, unconfirmed"`), since they communicate meaning primarily through color and would otherwise be invisible to a screen reader.
- Form inputs get associated labels.
- Images get `alt` text.

## Common Mistakes

- Hardcoding a hex value instead of a design-system token — there's almost always a token for it.
- Building a second badge component instead of extending `ProvenanceBadge`/`SeverityBadge`/`ReviewStatusBadge` with a new variant.
- Marking a component `"use client"` when it has no state, effects, or handlers.
- Rendering AI-generated content without its provenance badge, "to keep the layout clean" — this is exactly the shortcut the trust model exists to prevent.
- Reaching for an arbitrary Tailwind value (`text-[#5A6270]`) instead of checking `design-system.md` for the token that already covers it.

## Resources in This Skill

- None yet. If a canonical `ProvenanceBadge`/`SeverityBadge`/`ReviewStatusBadge` reference implementation is added later, it belongs in `resources/` in this folder — copy and adapt, don't rebuild from memory.
