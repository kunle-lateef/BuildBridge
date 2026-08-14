# Workflow: Creating a New Component

Follow this workflow when you need to build a new React component for BuildBridge. It chains the relevant rules and skills together so you end up with something that fits the codebase.

## Before You Touch Any File

**Step 1. Check whether the component already exists.**

Search `components/` for anything with a similar name or purpose — especially before building a new provenance, severity, or review-status indicator. If a similar component exists, the right move is almost always to extend it (add a variant, add a prop) rather than create a new one. Two slightly different badge components for the same concept is the start of a trust-model inconsistency, not just a code-quality one.

**Step 2. Decide where it goes.**

- Primitive (Button, Input, ProvenanceBadge, SeverityBadge, ReviewStatusBadge) → `components/ui/`
- Handoff domain (ScreenThumbnail, SpecificationRow, ComponentInstanceCard) → `components/handoff/`
- Review-screen specific (IssuePanel, ReadinessScoreDisplay, DecisionControls) → `components/review/`
- Dashboard only (HandoffList, HandoffStatusFilter) → `components/dashboard/`
- Composite used in multiple domains (EmptyState, PageHeader) → `components/shared/`
- Used exactly once in a page and complex → `app/.../_components/` alongside that page

**Step 3. Load the right context.**

Open and read these files in order:

1. `.agents/rules/design-system.md` — the tokens, spacing, typography, and component patterns, including the provenance/severity color mapping.
2. `.agents/rules/code-style.md` — naming, file organization, TypeScript conventions.
3. `.agents/rules/reference-inspiration.md` — if the component is part of the dashboard, review workspace, or developer handoff view: what reference-derived pattern it should express, and which reference-specific mechanisms (canvas/inspector panels, chat bubbles, editable blocks, command palettes) are explicitly out of bounds.
4. `.agents/skills/component-builder/SKILL.md` — the component template, variant patterns, and the provenance-aware component rules.

Do not skip these. They are short and they are the difference between a component that fits and one that quietly breaks the trust model.

## Build It

**Step 4. Create the file.**

Use the template from `.agents/skills/component-builder/SKILL.md`:

```tsx
import { cn } from '@/lib/cn';

type ComponentNameProps = {
  // required props first
  // optional props after
  className?: string;
};

export function ComponentName({ /* ... */, className }: ComponentNameProps) {
  return (
    <div className={cn('base-classes-here', className)}>
      {/* ... */}
    </div>
  );
}
```

**Step 5. Decide server vs. client.**

Default to a server component. Add `"use client"` only if the component actually needs state, effects, browser APIs, or real event handlers. If you're unsure, start without `"use client"` and let TypeScript tell you if you need it.

**Step 6. Style with design tokens.**

Tailwind classes, no inline styles, no custom CSS. Use token classes/CSS variables from `design-system.md` (`bg-[--color-primary]`, `text-[--color-text-body]`, the severity/status token pairs). If you find yourself reaching for an arbitrary value, pause and check whether there's a token for it. There almost always is.

**Step 7. Handle variants with `cva` if needed.**

See the pattern in `.agents/skills/component-builder/SKILL.md`. Do not stack conditional class strings.

**Step 8. If the component displays AI-generated content, apply the provenance rules.**

- Compose `ProvenanceBadge` / `SeverityBadge` / `ReviewStatusBadge` rather than hand-rolling a colored indicator.
- The provenance badge is visible in the default state — never hidden behind a hover or a secondary click.
- Suggested/Inferred text content is never set in a heavier weight than Confirmed content in the same view.

**Step 9. Wire accessibility.**

- Interactive elements get a visible focus state.
- Icon-only buttons get `aria-label`.
- Provenance/severity/review-status badges get an `aria-label` describing the state in words, since they communicate primarily through color.
- Form inputs get associated labels.
- Images get `alt` text.

## Check Your Work

**Step 10. Manually verify.**

If it's a primitive, render every variant, size, and state somewhere you can see them all at once during development — a scratch page, or an existing screen that already exercises several variants. (There's no dedicated preview route or Storybook-style setup in this codebase yet — don't assume one exists.) Tab into it to check the focus state. Hover over it. If it renders AI content, verify the provenance badge is visible without any extra interaction.

If it's a domain component, view it in the page that uses it. Resize to check smaller viewports. Check keyboard navigation.

**Step 11. Cross-check against the rules.**

- [ ] Named export, not default.
- [ ] `className` prop accepted and merged with `cn()`.
- [ ] No hardcoded colors or pixel values.
- [ ] No `any` types.
- [ ] No `"use client"` unless actually needed.
- [ ] Focus state visible.
- [ ] AI-generated content (if any) shows its provenance badge by default, not on hover.
- [ ] Suggested/Inferred content is not set in a heavier weight than Confirmed content.
- [ ] No `console.log` left behind.

**Step 12. Commit.**

Descriptive commit message. If the component is non-trivial, mention the intended use case in the message body so future you or future agents know why it exists.

## When Things Go Wrong

If you're stuck on something that doesn't fit the design system — a new color, a new badge shape, a layout the tokens don't cover — do not invent new tokens or patterns. Ask the developer. The whole point of a design system (and especially of the provenance/severity color mapping specifically) is that it doesn't grow unchecked, because unchecked growth here is how the trust model gets diluted one component at a time.
