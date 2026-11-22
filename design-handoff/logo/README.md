# BuildBridge logo — Frame (handoff drop)

Exported from the Figma file "Build Bridge — Redesign", page `06 — Logo`
(components `Logo/Mark` and `Logo/Lockup`). Text is outlined, so the files
don't depend on any font being loaded.

| File | Use |
|---|---|
| `buildbridge-logo.svg` | Lockup on light backgrounds (146×28) |
| `buildbridge-logo-white.svg` | Lockup on primary / primary-dark / gradient backgrounds |
| `buildbridge-icon.svg` | Mark alone, above 24px |
| `buildbridge-icon-small.svg` | Mark alone at 24px and below (heavier strokes). Use for the favicon / `app/icon.svg` |
| `buildbridge-icon-white.svg` | Mark alone on primary backgrounds |

Not wired into the app yet. When the codebase update happens:

- Replace `public/logo/*` and `app/icon.svg` with these files.
- `BrandMark.tsx`'s `ASPECT_RATIO` changes from `650 / 100` to `146 / 28`.
- The separate Desktop / Mobile cuts are no longer needed; one lockup scales.
- Update the "Logo & Brand Assets" section of `.agents/rules/design-system.md`.
