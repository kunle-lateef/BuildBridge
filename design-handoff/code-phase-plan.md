# Code-phase plan — BuildBridge redesign

Design source: Figma "Build Bridge — Redesign" (file `TGMunUhTf8DoFJV414JWNI`).
Nothing here is implemented yet. Follow AGENTS.md, the rules in `.agents/rules/`,
and the matching skill for each step.

## Decisions (agreed)

### 1. "New handoff" at the active-handoff cap → archive prompt, not a disabled button
Figma: `03 — Dashboard` → **Handoffs — At limit, archive one**.

- "New handoff" stays enabled. At the cap (Free 3, `ACTIVE_HANDOFF_CAP` in `lib/plan-limits.ts`)
  clicking it opens a dialog instead of the create flow.
- Title "You have 3 active handoffs". Body: "The Free plan allows 3 at a time. Archive one to
  start a new handoff. Archived handoffs keep their findings, and their share links keep working."
  - Verified: `lib/share.ts` doesn't filter on `Archived`, so share links do keep working.
    If that ever changes, this copy must change with it.
- Lists the active handoffs (name, readiness or "Analyzing", open gaps, updated) with an
  **Archive** button on each. Archiving calls the existing `archiveHandoff` action, then
  continues straight into the create flow. Footer: Cancel only.
- Add "See plans" only once a paid checkout exists.
- Server-side cap check in the create action stays as the real guard; the dialog is UX only.
- Accessibility: focus moves to the dialog title, Esc/Cancel return focus to "New handoff".

### 2. "See an example handoff" → static `/example` page, not a seeded share link
Figma: `05 — Share view` → **Example handoff — Desktop 1440**.

- New public route `app/example/page.tsx` rendering the real Share-view components with a
  typed fixture (Ledger · Checkout v3). No DB reads, no auth, no share token.
- Differences from the Share view:
  - Pill reads "Example" instead of "Read-only".
  - Banner under the top bar: "This is an example handoff with made-up data. It's what a
    developer sees when a designer shares a link."
  - Top-bar button is **Start a handoff** (primary) instead of "Flag something".
  - Flagging is off: the sidebar shows "Flagging is off in this example. On a real handoff,
    developers flag any value and the designer gets it." Row menus offer Copy value only.
  - No "Changed since your last visit" line.
  - Closing card: "Make one for your own screens" + Start a handoff.
- "Copy as checklist" and "Download as Markdown" work on the fixture.
- The fixture must pass the same Zod schemas as real data, and every number in it must
  come out of `calculateReadiness` (78%, 6 open gaps: 1 critical, 4 high, 1 medium).
- Point the homepage "See an example handoff" links at `/example`.

### 3. Drift comparison → add a structured numeric value (additive migration)
Correction to the earlier note: `Specification.unit` already exists (and the AI schema
already has an optional `unit`). Only one new column is needed.

- Problem today (`lib/consistency.ts`): numbers come from `parseFloat(value)`, so
  "2px primary, offset 2" parses as `2`, and values are grouped without checking the unit
  (12px and 12% compare as equal).
- Change (use `.agents/skills/db-migration-runner/SKILL.md`):
  - Add `numericValue Float? @map("numeric_value")` to `Specification`. Nullable, no backfill
    required, nothing dropped.
  - Add `numericValue: z.number().optional()` to `extractedSpecificationSchema` in
    `lib/ai/schemas.ts`; prompt the extraction stage to fill it only for plain measurements
    (8px, 48px, 16px) and leave it out for anything else ("darkens 8%", "Spinner only").
  - `lib/consistency.ts`: numeric comparison uses `numericValue` only, grouped by unit;
    specs without it fall back to the existing exact-text comparison. Never parse free text.
  - Existing handoffs pick up values on their next analysis.
- Readiness is unaffected (it doesn't read specifications).

### 4. Icons → Hugeicons Pro, Stroke Rounded (replaces lucide-react)
Figma: every page now uses `Icon/<name>` instances from the Hugeicons Pro library
(Stroke Rounded style, scaled from the 24px grid so strokes stay proportional).

- Packages: `@hugeicons/react` plus the Pro Stroke Rounded set
  (`@hugeicons-pro/core-stroke-rounded`). Pro packages install from Hugeicons' private
  registry with a license token. Keep the token in CI/Vercel env and `.npmrc` via an env
  var, never committed (security.md).
- Add one wrapper, `components/ui/Icon.tsx`, so size/stroke/`aria-hidden` defaults live
  in one place; then remove `lucide-react` from package.json.
- Mapping, lucide → Hugeicons. "Figma" = already used in the designs; "check" = pick
  during the code pass and confirm visually:

| lucide (code today) | Hugeicons | |
|---|---|---|
| Search | search | Figma |
| Bell | notification-01 | Figma |
| LayoutGrid | grid-view | Figma |
| LineChart | chart-line-data-01 | Figma |
| GitCompare | git-compare | Figma |
| Settings | setting-01 | Figma |
| Menu | menu-01 | Figma |
| MoreHorizontal | more-horizontal | Figma |
| Plus | plus-sign | Figma |
| X | cancel-01 | Figma |
| XCircle | cancel-circle | Figma |
| Check | tick-02 | Figma |
| CheckCircle2 | checkmark-circle-02 | Figma |
| AlertCircle | alert-circle | Figma |
| AlertOctagon, AlertTriangle | alert-02 | Figma |
| ArrowRight | arrow-right-02-round | Figma |
| Clock | clock-01 | Figma |
| Copy | copy-01 | Figma |
| Trash2 | delete-02 | Figma |
| Eye | view | Figma |
| EyeOff | view-off | check |
| List | left-to-right-list-bullet | Figma |
| Circle, CircleDashed | plain circle (no icon needed) | Figma |
| History | clock-01 or a rewind variant | check |
| Info | information-circle | check |
| Layers | layers-01 | check |
| Lightbulb | bulb | check |
| Link2 | link-01 | check |
| Loader2 | loading-03 | check |
| MapPin | location-01 | check |
| MessageSquareWarning | bubble-chat (Figma) or a warning variant | check |
| Send | sent | check |
| Shield | shield-01 | check |
| TrendingDown | chart-down | check |
| UploadCloud | cloud-upload | check |
| User | user | check |
| Expand | arrow-expand-01 | check |
| Sparkles | remove where it signals "AI magic" (anti-slop); otherwise check | check |

- Figma-only icons that code will need: flag-02, download-04, mail-01, archive-02,
  thumbs-down, refresh, note-01, edit-02, square-lock-02, arrow-left/right/down-01-round,
  arrow-down-02-round, minus-sign.

### 5. Batch 1 flows (designed; behaviour to confirm in code)
Figma frames: `03 — Dashboard` → New handoff dialog; `04 — Handoff` → Draft (4 states),
Analysis failed, Partly analyzed, Review changes, Modify a value, Confirm all dialog,
Screens / Responsive / Developer feedback / History / Notes tabs; `05 — Share view` →
Preview as developer.

Code changes these designs depend on:
- **Partly analyzed must hide readiness.** If gap detection didn't run, the score is
  computed from incomplete issues and looks better than it is. Show "Partly analyzed"
  instead of a percentage until all 5 stages finish. (Trust rule, AGENTS.md #4.)
- **Failed run status:** design shows the handoff as Draft with "Try again". Confirm what
  `deriveHandoffStatus` should do on a Failed run (today it only moves between
  Analyzing / NeedsReview / Ready).
- **Does a failed run use an analysis?** Recommend no. The design doesn't promise either
  way until this is decided.
- **Conflicts after re-analysis:** "Keep my decision" / "Reopen gap", never auto-applied
  (AGENTS.md #3). The changelog panel already groups New / Still flagged / Conflicts.
- **Bulk confirm** covers one provenance group only (Detected), matching
  `BulkDecisionBar`; the dialog says Inferred and Suggested aren't included.
- **Upload errors** reuse the existing messages, with a fix added: "Unsupported file type.
  Use PNG, JPG or WebP." and "File is larger than 25MB. Export it at 1x or as JPG."
- **Copy casing:** buttons are sentence case ("Create handoff", "Start analysis"); code
  has "Create Handoff" / "Start Analysis".
- **Screens tab** shows "Add screens" and "Re-analyze"; the note that unchanged screens
  don't use an analysis comes from the Settings copy, so confirm it matches the quota code.

### 6. Batch 3 (edge and system states)
Figma: `02 — Auth` (too many attempts, session expired, email can't be used, password too
weak), `11 — System` (404, error page, loading skeletons, toasts), `01 — Home` (Privacy,
Terms), `08 — Insights` (empty).

- **Sign-up email error stays vague on purpose** ("We couldn't create an account with that
  email"), matching the code, so the form never reveals whether an email is registered.
- **Session expired** is a sign-in notice that returns the user to where they were
  (needs `callbackUrl` handling if it isn't already there).
- **Toasts:** one at a time, bottom-right (bottom-center on mobile); success/info auto-close
  after 5s, errors stay. "Handoff archived · Undo" is new behaviour (calls unarchive).
- **Loading:** the 5 existing `loading.tsx` files should follow the two skeletons (layout
  shape only, no fake data, no counts).
- **Legal copy is unchanged** — the Figma pages use the live text verbatim. Two things in
  it look out of date and need your call before launch:
  - **Confirmed: production storage is Backblaze B2** (checked against the live app's image
    URLs). The Privacy page wrongly says Cloudflare R2, so it needs correcting: "stored in
    object storage (Backblaze B2)". Also update the R2 wording in `lib/storage.ts` comments
    and `.env.example` so the next person isn't misled.
  - Privacy lists "confirm/modify/reject/**override**" decisions; Override is being removed
    from spec and state rows (open item 2).

### 7. Batch 4 (contextual assistant)
Figma: `04 — Handoff` → Assistant (from a finding), Assistant conversation, Assistant too
many messages; "Ask BuildBridge" button in the Review header.

- **Entry points:** an "Ask BuildBridge" header button (replaces `AskBuildBridgeFab`, which
  covered the findings panel) and "Ask about this finding", which opens the drawer with an
  "Asking about: <component> · <property>" chip and 3 suggested questions for that finding.
  The chip context needs passing to `/api/assistant` (today only the handoff is scoped).
- **Answers show their source:** each answer names the finding it used, with its
  provenance or severity badge, plus a link back to it ("Review this finding", "Answer the
  gap"). Needs the model's reply to return the finding references, validated with Zod,
  rather than free text only.
- **Insufficient evidence** uses the exact `INSUFFICIENT_EVIDENCE_MESSAGE`, then says what's
  missing. Already required by the system prompt.
- **Rate limit** (20 messages a minute) shows inline: "Too many messages in a short time.
  You can send again in about a minute." The code's current message is "Too many messages.
  Try again shortly."
- **Placeholder:** "Ask about this handoff" (code: "What happens to the sidebar on mobile?").
- **Footer:** "Answers can be wrong. Check anything important against the findings before
  you share."
- **Layout:** the assistant takes the findings panel's place (same column), so the header
  and canvas stay visible and the asked-about component stays outlined. Full-screen sheet
  on mobile.
- **New conversation** in the drawer header starts a fresh thread (today the code always
  continues the handoff's last conversation).
- **While answering:** text streams in with a typing indicator; the send button becomes
  **Stop**, which cancels the request.

### 8. Final audit fixes
Figma: `12 — Emails` (4 emails, analysis subject variants, share link preview), plus new
frames for search empty / no results, keyboard shortcuts, Not a gap, the mobile bell,
mobile draft, mobile flag sheet and mobile readiness breakdown.

- **Design tokens added:** text styles `Desktop/Caption Medium` (12/16 Medium) and
  `Mono/Value Small` (12/16 JetBrains Mono); colour `overlay/scrim` (#0F172A at 40%) for
  every dialog backdrop. Add all three to `tokens/` and Tailwind.
- **Emails (`lib/email.ts`):** switch to simple HTML using the Figma layouts and the subjects
  shown. Never print raw status values (today: "finished with status PartiallyCompleted").
  The richer bodies need more data passed in: component and gap counts and readiness for
  analysis emails; the flagged value and message for flag emails; the value name for
  "marked implemented". Every notification email gets the "Turn off emails" footer link.
- **Share link preview:** add `app/share/[token]/opengraph-image.tsx` (1200×630) showing
  only the handoff name, readiness and "Read-only handoff", the same data the link already
  exposes, never designer-only data.
- **Legal copy (approved):** update the live Privacy and Terms text to match Figma: no long
  dashes, "Backblaze B2" instead of "Cloudflare R2", no "override" decision.
- **Notification bell:** the dropdown is the mobile header's; on desktop the sidebar's
  Notifications item goes straight to the page.
- **Keyboard shortcuts:** J/K, C/M/R, ⌘K, ?, Esc, as listed in the shortcuts dialog.

### 9. Marketing: hero loop and framed auth panel
Figma: `13 — Marketing concepts` → "Hero loop — storyboard" (6 keyframes + motion spec);
`02 — Auth` side panels now use the framed panel.

- **Hero stays as designed; it becomes a 14s loop.** Rework
  `components/marketing/heroLoopTimeline.ts` (+ `HeroLoopFindings`, `HeroLoopScreen`) to
  the storyboard beats: analyze the screen → findings land → confirm a Detected value →
  modify an Inferred value → answer the critical gap → ready, share dialog, "Link copied" toast.
  Playable reference: https://claude.ai/artifact/HPxW55U81N8gbwzKntgjLd
- **Every state in the loop is a real Review state.** Reuse the real components rather than
  hero-only copies: the Analyzing stage list, `ProvenanceBadge` + pins styled by type
  (Detected solid, Inferred dashed, Suggested dotted), `ReviewStatusBadge` ("Confirmed"),
  the Modify editor ("Save change" + the "Was … (Inferred)" note), the expanded gap card
  ("Your answer", "Save answer"), the Share dialog and the toast. Not-ready bar is
  `warning` (#92400E), ready bar is `success`; badges use 4px radius.
- **Hero window uses the Review page's navigation.** The left "Overview / Components /
  Specifications…" menu (taken from the developer share view) is removed. Under the title
  bar add the Review tabs (Review 26 · Screens 4 · Responsive 6 · Developer feedback 2 ·
  History · Notes, Review selected), and above the canvas the screen switcher
  (‹ Checkout 1 of 4 ›) with the Detected / Inferred / Suggested / Gap pin key, 53px tall
  to line up with the Findings header. The window grows from 654 to 698px; the canvas
  takes the freed width. Phones show only the findings panel, so no tabs there.
- **"What designers review, and what developers get" fixes (layout kept).** Intro: "Developers
  get a read-only link: decided specs to build from, and anything still open clearly
  marked." Both cards name the **Pay button**; the designer edits the focus ring from
  "2px primary, offset 2" to "3px primary, offset 2" and the developer table shows the same
  value marked "Modified by designer". Split the developer table into **Decided** (Corner
  radius, Fill, Focus ring) and **Not decided yet** (Hover, Loading, muted). Copy: "Gaps are
  flagged for you / …flagged, so you can answer them before handoff" and "Ready means ready /
  A handoff only shows as ready once every critical gap is answered." Remove the green
  "No account needed" pill. Equal-width columns; trays share one height. Phones: same split
  and wording, "Spinner only" (not "spinner").
- **"How a handoff comes together" fixes (layout kept).** In `HowItWorksInteractive`: the
  card note becomes "An open critical gap keeps the handoff from being ready. Other gaps
  lower the score." (only an open critical gap blocks Ready, formula v1); card title
  "Gaps on Checkout" with "2 of 6 in this handoff"; drop the "Step 3 of 6 · …" subtitle and
  the corner "+" marks; top of the card lines up with the first step; step numbers get a
  fixed width so the names line up. Phones: add the intro line under the headline and the
  same card title, count and note.
- **"Every finding shows how sure it is" fixes (layout kept).** Intro: "BuildBridge isn’t
  always certain, so every value says how it knows: detected, inferred or suggested. The
  label stays visible everywhere, including your developer’s link." (drop "reads each design
  once", since re-analysis exists). 16px between headline and intro. Connector stems leave the
  button at ¼, ½ and ¾ of its width. The three cards share one height. Phones: same intro,
  add the three descriptions, and use the same light tints (18% fill) and pill badges as
  desktop.
- **FAQ answers (layout kept).** In `FAQ_ITEMS` (`app/(marketing)/page.tsx`):
  - "How many handoffs can I analyze?" → "A free account includes 5 analyses each month and
    3 active handoffs at a time. Running analysis again on a handoff that hasn’t changed
    doesn’t use one." (matches `analysisQuota` default 5, `ACTIVE_HANDOFF_CAP.Free` 3 and
    `findReusableRun`.)
  - "Can a developer edit anything on the shared link?" → "They can’t change any values. They
    can flag something that’s unclear and mark values as implemented, and you see both on
    your side." (Only say "mark as implemented" once that share-view action ships.)
  - Question becomes "What if I disagree with a finding?" (no "AI"); answer "Reject it, or
    modify it to the right value. If a later analysis disagrees with your decision, the
    change comes back to you to review. It’s never applied on its own." (no "override").
  - "Can I revoke a shared link?" → "Yes. Revoke it any time from the handoff page and it
    stops working straight away." (no long dash.)
  - Remove the intro line under "Common questions".
- **Header and footer links follow the page order and Figma's labels.** In
  `MarketingHeader` and `MarketingFooter`: Who it’s for · How it works · Accuracy · FAQ
  ("Accuracy" replaces "Why trust it"; it can keep linking to `/#trust`). Footer
  "Get started" column: Start a handoff (`/sign-up`) · Example handoff (`/example`, once that
  page ships) · Sign in. Legal: "Privacy" · "Terms".
- **Colour palette A · Blueprint (approved Nov 21).** Replace the stock Tailwind values in
  the token source and Tailwind theme (Figma `Color` collection is already updated):

  | Token | New | Token | New |
  |---|---|---|---|
  | background | #F9FAFC | primary/default | #2B48C8 |
  | surface | #F2F4F8 | primary/dark (hover) | #213AA6 |
  | border | #E1E5EC | primary/light | #EAEEFC |
  | text/primary | #0E1320 | detected | #0B7A5E / #E1F3EC |
  | text/body | #1F2633 | inferred | #9A5A00 / #FBF0DC |
  | text/secondary | #4A5366 | ai-suggested | #A12D8A / #F8E5F2 |
  | text/muted | #636B7E (was #94A3B8, failed AA) | error, severity-high | #B42424 / #FBE5E3, #FDF2F1 |
  | text/dismissed | #7C8396 | warning | #4A5366 / #F2F4F8 (neutral: "Needs review" chips, not-ready bar) |
  | info | = primary | success | #1F2633 / #F2F4F8 (ink, not green) |
  | overlay/scrim | #0E1320 @ 40% | | |

  Rules: colour only means evidence (Detected / Inferred / Suggested) or a problem (red).
  "Confirmed", "Ready", "Answered" and "Implemented" render as ink text with a check, not
  green pills (`ReviewStatusBadge` Confirmed variant has no fill). Update the logo mark to
  the new primary. Checked: brand vs evidence colours ΔE ≥ 17.5; colour-blind separation
  7.0 with labels and solid/dashed/dotted lines as secondary encoding; all text ≥ 4.5:1.
- **Guided review + state-first header (designed Nov 21).** Figma: `04 — Handoff` → frames
  "Guided review — 0…4".
  - Header leads with the state ("Not ready · 1 critical gap blocks sharing" / "Ready to
    share · …"), with readiness % and "x of y reviewed" small underneath and a red marker on
    the bar for blockers. While not ready, **Review next · N left** is the primary button and
    Share handoff is secondary; once ready they swap. The old "Next: …" line goes away.
  - **Review next** opens a guided panel in place of the findings list: progress bar split
    Gaps · Inferred · Suggested · Detected, one finding at a time in that order, its pin
    highlighted on the canvas (others dimmed to 30%), keyboard keys (C / M / R, S skip,
    ← back, Esc exit, ⌘↵ save) and an "Up next" line.
  - Gaps: answer box + Save answer / Not a gap / Skip for now. Inferred and Suggested: value
    in large mono, why it has that label, Confirm / Modify / Reject / Skip.
  - Detected values come as one ticked list ("Confirm N values"); unticked ones go back
    into the queue.
  - Finish screen: summary (confirmed, modified, rejected, gaps answered, skipped) with
    Share handoff primary and a link back to anything skipped.
  - Queue order and counts come from existing findings data; no schema change.
- **Phone triage mode (designed Nov 21).** Figma: `04 — Handoff` → "Phone triage — 0…3".
  On phones the handoff page opens on **Needs you**: open gaps plus open developer flags,
  under the state card. A tap starts a one-at-a-time flow (counter "1 of 4", Skip):
  - gap: a crop of the screen around the pin, question, suggested fix, answer box, sticky
    **Save answer** / Not a gap;
  - developer flag: the question, what the handoff says now, reply box, optional "also
    answer the related gap", sticky **Reply and resolve** / Acknowledge.
  - Done: "You’re all caught up" with the state card and Share handoff.
  Value review (confirm / modify / reject) is not offered on phones: a card says how many
  values are left and offers **Email me a link** to continue on a computer (new: a
  transactional email with a deep link to the Review page).
- **Try it with the example (designed Nov 21).** Figma: `03 — Dashboard` → "First run — 0"
  and `04 — Handoff` → "Example handoff — 1…2".
  - The empty dashboard offers two cards: **Try it on an example** (recommended, about two
    minutes, "Open the example") and **Start your own handoff** (three steps, "New
    handoff"). Also fixes the unpadded "No activity yet." row.
  - "Open the example" copies the Ledger · Checkout v3 fixture into the user's account as a
    handoff flagged `isExample`: status chip "Example", a banner ("…doesn’t use an analysis
    or a handoff slot, and only you can see it." + Delete example), and the guided review
    ready to start. It never counts toward `analysisQuota` or `ACTIVE_HANDOFF_CAP`, can’t be
    shared publicly (its share button becomes "See what the developer gets", opening the
    developer preview), and can be deleted any time.
  - Finishing the guided review shows "That’s the whole loop" with "See what the developer
    gets" and "Start your own handoff".
  - Needs: an `isExample` flag (migration), a seeded fixture (screens + findings) and a
    copy action. Notifications are not generated for the example.
- **Laptop layout, 1280 and below (designed Nov 21).** Figma: `04 — Handoff` → "Review —
  1280 laptop" and "…, findings hidden". Below 1440px the sidebar collapses to a 64px icon
  rail (logo mark, bell, search, Handoffs, Insights, Settings, avatar; tooltips on hover),
  page side padding drops to 24px, and the findings panel is 404px. The panel gets a
  "Hide findings" (») control; hidden, it becomes a 48px rail with « and "26 to review",
  and the canvas takes the width. Remember the choice per user (localStorage is fine).
- **Focus states (designed Nov 21).** Figma: `Foundations` → "Focus states". Global rule:
  `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }` with
  the element's own radius. Text inputs instead switch their border to primary at 2px.
  Never show it on mouse click. Example in context: guided step 2, Confirm focused.
- **Type and spacing scale (applied Nov 21).**
  - Type: 12 / 14 / 16 / 20 / 28px in the app (36+ marketing only), mono values 13px.
    Text styles changed: Heading 3 22→20 (lh 28), Heading 4 18→16 (lh 24), Label 13→14
    (lh 20), Mono/Value Small 12→13 (lh 18). Panel body text is 14px minimum.
  - Spacing: 4 / 8 / 12 / 16 / 24 / 32 (48+ for page sections). Off-scale values were
    snapped (5→4, 6/7/9→8, 10/11/13→12, 14/15/18→16, 20/22/26→24, 28/30/36→32) across
    ~2,700 auto-layout frames on the app pages. In Tailwind, prefer `gap-1/2/3/4/6/8` and
    `p-3/4/6/8`; avoid `*-1.5`, `*-2.5`, `*-3.5`, `*-5`, `*-7`.
  - The customer's own screens (canvas, crops, thumbnails) and component internals were
    left untouched.
- **Refined Review layout (rolled out Nov 21).** One header band: title block (title + status
  chip, state line and small readiness bar underneath) on the left; actions in one row on
  the right: Ask BuildBridge as a text button (no border), Share handoff, Review next · N left,
  ⋯. The canvas has no border (flat surface, screen shown at ~82%). Findings panel: the bulk
  "Confirm all / Reject all" bar is removed (guided review's Detected step replaces it); the
  re-analysis notice is a single line with a bottom divider, not a tinted band; group
  headings are small coloured labels (DETECTED 3, INFERRED 1, SUGGESTED 1) instead of pills.
- **Narrower app navigation (designed Nov 21).** Sidebar is now Handoffs · Insights ·
  Settings. Notifications moves to a bell beside the logo in the sidebar header (unread
  count badge in primary; filled when on the Notifications page); phones keep the bell in
  the top bar, so the menu drawer has none. Drift is no longer a page of its own: Insights
  gets tabs **Readiness** and **Drift N**, and `/drift` should redirect to `/insights?tab=drift`.
  The dashboard "View drift" link points there.
- **Final audit, Nov 20.** Copy and data fixes still to carry into code:
  - `lib/ai/copy.ts` `INSUFFICIENT_EVIDENCE_MESSAGE` → "I can’t tell from these designs."
    (check the prompt and any tests that match on the old sentence).
  - Sign-in page title "Welcome back!" → "Sign in to BuildBridge" (matches Figma, no "!").
  - How it works step descriptions in `app/(marketing)/page.tsx`: drop the long dashes,
    "override" and "never a false green light"; keep them short and literal.
  - Settings plan card: "Analyses reset each billing cycle. Running analysis again on a
    handoff that hasn’t changed doesn’t use one."
  - Privacy: Backblaze B2 (not Cloudflare R2); "This is the most important part of this
    policy."; share link shows "decided specs, plus anything not decided yet, clearly
    marked"; deletions "Both permanently remove the records and uploaded files."; cookies
    "We only use the cookies needed to keep you signed in securely. We don’t use advertising
    or tracking cookies."; no long dashes anywhere in Privacy or Terms.
  - **Open:** Privacy and Terms say "contact us directly" but the site has no contact
    address. Needs an email from the owner before launch.
  - Example data (Insights counts, Drift values, share-view focus ring) is design-only; the
    live pages compute these from real data.
- **No lines between home sections.** Drop `border-t border-[--color-border]` from the
  `who-its-for`, `how-it-works` and `faq` sections in `app/(marketing)/page.tsx`. Spacing
  and the Accuracy section's surface colour separate sections; the only full-width lines
  left are under the header and above the footer.
- **Closing section (v3).** Figma: `01 — Home` → "Final CTA" in both Home frames (the
  old version is kept hidden as "Final CTA (before v3)"). Replace the dark indigo band in
  `app/(marketing)/page.tsx` with: one-colour headline (Display 48 / Mobile Display 32),
  the line "They get every value you confirmed and your answer to every gap, in one
  read-only link.", "Start a handoff" + "See an example handoff", and one bordered card
  quoting the designer's answer to the declined-card gap (SeverityBadge, attribution
  "Dami Ajayi, designer", footer "Ledger · Checkout v3 · 85% Ready"), labelled
  "Example handoff · what the developer sees". No grid, crop marks or steps. The quote
  text (22/32 desktop, 18/27 mobile, Regular) needs a new "Quote" text style.
- **Fix today's dishonest score.** The current loop sets the score to the share of
  findings confirmed (`confirmedCount / 4 * 100`) and "resolves" a critical gap in one
  click. Readiness must follow formula v1: it holds at 78% through Confirm and Modify and
  only moves to 85% (Ready) when the critical gap is answered.
- Keep the existing good parts: pauses off-screen, reduced-motion still frame (now frame 6),
  first paint on the findings frame, aria-hidden and no focusable controls.
- **Auth side panels:** dotted canvas (border colour dots, 24px grid) on the background
  surface, indigo corner brackets from the logo around the cards, soft shadow on the cards,
  and a "marked implemented · just now" hint on sign-in. The hint can cycle a few real
  events (CSS only), and stays still under reduced motion.

## Earlier open items (still to do)
1. Filter Rejected findings out of `buildDeveloperProjection` (trust bug — do first).
2. Gap actions: Add answer / Keep open / Not a gap; remove Override from spec and state rows.
3. Add `--color-surface-raised: #FFFFFF`; white backgrounds for marketing and auth.
4. Logo: replace `public/logo/*` and `app/icon.svg` from `design-handoff/logo/`;
   `BrandMark` aspect ratio 146/28; update design-system.md.
5. Rebuild each page to match Figma (Home, Auth, Dashboard, Review, Share, Settings,
   Notifications, Insights, Drift), including empty, error and mobile states.
6. New behaviour from the audits: readiness breakdown popover (from `calculateReadiness`
   category scores, formula v1), keyboard review shortcuts (J/K, C/M/R, ?), Copy as
   checklist, "N of M decided values implemented", Notifications Unread filter,
   delete-dialog counts, compact sidebar usage card.
7. Carry over final copy strings from Figma.

## Suggested order
Trust fix (open item 1) → tokens + logo + icon wrapper (decision 4) → schema change (decision 3) → page rebuilds,
including the cap dialog (decision 1) → `/example` (decision 2) → new behaviours.

## Marketing additions (previews on Figma page "13 — Marketing concepts", not yet approved)
- **What your developer opens** (node 257:588): home section after How it works. Three points (Decided first / Not decided yet / Built for how developers work), "See an example handoff →" to `/example`, and a cropped share view (Pay button table, row menu) built from the real share components.
- **Where your designs go** (node 258:219): dropped by the user, not built. Four steps: upload (Backblaze B2, private, signed links) → analysis (Anthropic's Claude API, only when you start it) → review (only you) → share (read-only, revocable). Links to `/privacy`.
- **Pricing page** (node 259:223): new `/pricing` route plus a header link. Free ($0): 5 analyses a month (unchanged reruns are free, per `findReusableRun`), 3 active handoffs (`ACTIVE_HANDOFF_CAP`), full review, read-only links. Team: "Talk to us", up to 50 active handoffs, analyses set per account. Billing note: no self-service billing yet. Three questions. Verified: archived handoffs don't count toward the cap and their share links keep working (`lib/share.ts` doesn't check status).
- Blocked on: a contact address for "Talk to us".

## Batch 1 status (Nov 21, in code, uncommitted)
- Done: Blueprint palette (tokens/color-tokens.tokens.json → tokens.css, logo/favicon #2B48C8,
  Confirmed/Resolved as ink + check), type scale (H3 20/28, H4 16/24, Label 14/20, mono 13/18),
  spacing snapped (131 classes), global focus (globals.css), icons via components/ui/icons.tsx.
- Icons use the free Hugeicons Stroke Rounded package; Pro needs the licence token first.
- Migration 20261121120000_add_numeric_value_and_is_example: generated from a schema diff (local
  Postgres wasn't running). Run `prisma migrate dev` locally and apply to Supabase manually before
  deploying. CURRENT_ANALYSIS_VERSION is now 2. isExample is a column only; the example flow is later.
- Next: rebuild the hero loop to match the approved v8 (formula v1 score, Review tabs, new values).
- Hero loop rebuilt to v8 (Nov 21, uncommitted): heroLoopTimeline.ts, HeroLoopScreen, HeroLoopFindings,
  HeroHandoffLoop. Score follows formula v1 (78% → 85% only when the critical gap is answered),
  Review tabs + screen switcher, real badges, phone layout = findings panel only. 9 timeline tests.
  Open: the 1200px stage renders at ~52% in the coded two-column hero; Figma stacks the window full
  width under "Design handoffs that show their work." (Start a handoff / See an example handoff).
- Hero now follows Figma's layout (Nov 21): "Design handoffs that show their work." left, copy +
  "Start a handoff" right, window full width below (~83% at 1024 content width; Figma uses 1200, the
  coded site is 1024 throughout). "See an example handoff" is left out until /example exists. The old
  badge, accent headline and "Create account / Sign in" pair are gone.

## Figma match pass (Nov 21, uncommitted)
- Matched to Figma `01 — Home` and Foundations: badges (dot + label, 20px, 4px radius; Severity
  uses a dot, not an icon), Button md/lg (14/20 semibold, 40/44px), CTA gradient #3D5AD6→#213AA6,
  header (Accuracy, Sign in ghost, Start a handoff; + Pricing per the Pricing frame), footer,
  1200px content width (components/marketing/container.ts), white marketing pages, and every home
  section (Hero, Who it's for, How it works, Accuracy, FAQ, closing v3). Removed HeroGridLens,
  HeroBackground, HowItWorksInteractive, TrustCards.
- Deliberately not in code: "See an example handoff" / "Example handoff" links (no /example yet).
- Not yet compared or built: auth pages (`02 — Auth`), Privacy/Terms frames, and the app pages
  (dashboard, handoff/Review incl. guided review, phone triage, example first run, narrower nav,
  1280 layout, share view, settings, notifications, insights).
- Nov 21, later: auth pages matched to Figma `02 — Auth` (split layout; Sign in "Opening a shared
  handoff?" panel, Sign up designer/developer panel; Figma copy, error banners, "Check your email",
  "This reset link doesn't work"); reset password now enforces the same rules as sign-up. Privacy
  and Terms rebuilt on Figma's "On this page" layout with Figma's text. Logo replaced with the
  Figma `10 — Logo` exports (#2B48C8), favicon = small mark. Input/Textarea match Figma's Input.
- Not built: "Sign in — session expired" (needs a sign-out reason the app doesn't send yet).
- App pages still to do (~95 Figma frames): 03 Dashboard (15), 04 Handoff (41 incl. guided review,
  phone triage, example, 1280 layout), 05 Share view (10), 06 Settings (7), 07 Notifications (3),
  08 Insights (3), 09 Drift (3, merging into Insights), 11 System (5), 12 Emails (6).
  Needs the local database (Docker) running to sign in and compare each page.
- App shell matched to Figma `03 — Dashboard` (sidebar: logo + bell, search ⌘K, Handoffs · Insights ·
  Settings with count, usage card, account row; phone top bar only). Drift left the nav (page still at
  /drift until Insights gets its Drift tab). Handoffs page rebuilt: tabs + table + activity, attention
  rail + drift card, "Get started" first run. Not yet: the "Try it on an example" card (needs the
  example flow), the Analyzing row's stage line, and attention "→ Makes it ready" impact lines.
- Local setup used: Docker Postgres/Redis, MinIO, analysis worker; test account in .env.example.
- Local seed (`npm run db:seed`): local-only (refuses without USE_AI_FIXTURES and a localhost DB);
  test account designer@buildbridge.test; three handoffs (Checkout v3 analysed, iOS tab bar analysed
  + shared + 2 open flags, Onboarding mid-analysis) run through the real pipeline in fixture mode.
- FIXED (Nov 22): deleteHandoff now deletes AnalysisRuns before the Handoff (analysis_runs.handoff_id is ON DELETE RESTRICT). Account deletion goes through deleteHandoff, so it is fixed too. Verified on the local DB.
  ON DELETE RESTRICT, so deleting any analysed handoff fails. Fix: delete runs before the handoff
  (handoff_issues.source_analysis_run_id is ON DELETE SET NULL). Check account deletion too.
- Review page restructured (Nov 22) to Figma `04 — Handoff`: header band (breadcrumb, title + status,
  "Not ready · N critical gap(s) block sharing" / "Ready to share", readiness bar with blocker marker,
  "x% readiness · n of m reviewed", Ask BuildBridge text button, Share handoff dialog, ⋯), tabs
  (Review · Screens · Responsive · Developer feedback · History · Notes, in the URL as ?tab=), Review tab =
  canvas (switcher, pin key, zoom, pins) + Findings panel. Still to do: findings panel internals (compact
  gap rows with impact, To review / Reviewed, group labels, component cards, no bulk bar), guided review
  ("Review next · N left"), Review states (analyzing, failed, partly analyzed, gap selected, modify,
  readiness breakdown, keyboard shortcuts), phone layout and 1280 layout.
- Findings panel matched (Nov 22): To review / Reviewed switch, "Gaps · n" compact rows (severity, title,
  "→ Makes it ready" for the last open critical gap, "→ +n%" otherwise, expand for detail + decisions),
  "Components · n" collapsible cards (pin number from the canvas, summary line) with rows grouped under
  DETECTED / INFERRED / SUGGESTED labels; selecting a row shows Confirm / Modify / Reject (Override is
  still supported by the action but not offered in the row, as in Figma). Bulk "Confirm all" removed
  (guided review's "Confirm N values" replaces it). Not yet: re-analysis notice line, per-card
  "Add note" / "Ask about this finding" footer, the gap answer box ("Your answer"/"Save answer").
- Gap answer box (Nov 22), Figma "Review — Gap selected": opening a gap shows severity, provenance,
  "Screen · Component", title, description, "Suggested fix:", "→ Answering this makes the handoff ready"
  (last open critical gap), "Your answer" + "Developers see this as the confirmed behavior.", Save answer /
  Cancel, "Or: Keep open · Not a gap". Uses existing decisions, no schema change: Save answer = Override
  (Resolved, answer in DesignerDecision.newValue), Keep open = Confirm (InReview), Not a gap = Reject
  (Dismissed). lib/gapAnswers.ts reads the latest answer; it shows in the Reviewed view, the share view
  ("Designer's answer:") and the Markdown export. share.test asserts only the answer text is exposed.
- Guided review (Nov 22), Figma "Guided review — 0…4" (frames 1-4 sit on the Cover page): header
  "Review next · N left" (primary while not ready; Share becomes primary once ready) opens ?guided=1.
  Panel: "Reviewing n of N", progress split Gaps · Inferred · Suggested · Detected, gap step (answer /
  Not a gap / Skip for now), value step (BuildBridge read, why-this-label line, Confirm / Modify / Reject /
  Skip), Detected values as one ticked list ("Confirm N values"; unticked come back one by one), finish
  summary with Share handoff. Keys: C/M/R/S/←, N, ⌘↵, Space, Esc. Canvas follows the finding and dims
  other pins to 30%. Pins now match Figma (white, outlined solid/dashed/dotted). Skips record nothing.
  Verified in the browser end to end. Not built: ↑↓ to move in the Detected list.
- Review states (Nov 22): Draft (Figma "Draft — Add screens / Ready to analyze": intro line, dropzone,
  numbered screen list with drag-to-reorder + Alt+↑/↓ + remove, Analysis card with quota wording and
  Start analysis), Analyzing (status line "Analyzing n screens · stage · k of 5", tabs Review/Screens/Notes,
  canvas + Analysis stage list), Analysis failed (red banner + Try again, Failed / Didn't run stages),
  Partly analyzed (banner + Run analysis again). New actions deleteDraftScreen / reorderDraftScreens
  (Draft only, owner-checked, tested).
- DECIDED Nov 22 (developer: follow Figma): a failed run with no earlier successful run leaves the
  handoff a Draft with no score; a partly completed run sets Needs review with the score hidden; a failed
  re-run after an earlier success keeps the earlier findings' readiness. Formula unchanged; the per-run
  snapshot still records the computed score. lib/ai/pipeline.ts + pipeline.test.ts (3 cases). Banner now
  says "Readiness stays hidden until they are, so it can't look better than it is."

## Share view (05) — 2026-11-22
- `app/share/[token]/page.tsx` rebuilt: ShareTopBar (Read-only, Copy as checklist of decided values, Download as Markdown, Flag something), sticky "On this handoff" nav with counts, overview with readiness line ("x of y decided values implemented"), screens as a flow row with flow labels, one ShareComponentTable per component (Decided / Not decided yet, rejected hidden, row menu: copy, mark implemented, flag), then Responsive, Edge cases, Implementation notes, Recent updates, flag form (#flag).
- With no critical gap open the line reads "No critical gaps open", not "Ready": the projection carries no handoff status.
- Open: preview page (`handoffs/[id]/preview`) still uses the old stacked sections; "Your flags" list in the nav not built.
- Preview page now renders the same `components/share/DeveloperView.tsx` as the share link (the share page is a thin wrapper). It moved to `app/(preview)/handoffs/[handoffId]/preview` (same URL) so it shows without the dashboard sidebar; middleware still guards `/handoffs/*` and the page checks ownership. Preview turns off marking, flagging and "what changed", and downloads from `/api/handoffs/[id]/export`.
- Deleted the old stacked sections: OverviewSection, ScreensSection, ScreenFlowsSection, ComponentsSection, SpecificationsSection, InteractionsSection, StatesSection.

## Settings (06) — 2026-11-22
- `settings/page.tsx` rebuilt as Figma's labelled rows (`SettingsRow` in SettingsTabs.tsx): Account (Profile, Plan and usage), Notifications (Email switch card), Security (Password, Sessions, Delete account in red).
- `lib/plan-limits.ts` `summarizeUsage()` now feeds both the sidebar and Settings (tested); QuotaUsageDisplay is the Figma card with two meters and the red pace line.
- Delete account: outline-red trigger (new Button variant `dangerOutline`); the dialog follows Figma, listing what goes (active/archived handoffs, live share links) with "Keep my account" first. The old type-DELETE box is gone, per Figma.
- `components/ui/Modal.tsx` restyled to Figma's dialog for every modal: white, 460px, radius 12, 16px title, no ✕ (buttons, Escape and backdrop close it).
- Email switch is a real `role="switch"`; copy matches Figma.

## Notifications (07) — 2026-11-22
- Page rebuilt: title row with "Email settings" (→ `/settings?tab=notifications`, Settings now honours `?tab=`), All / Unread switch with count, "Mark all read"; one card split into Today / Earlier; rows have unread dot, type icon, title, relative time ("40 min ago", "Yesterday"), body, handoff name. Empty state per Figma. Shared `NotificationList` also restyles the bell dropdown.
- Wording now set at dispatch (`lib/notifications.ts`), per Figma: "Analysis finished · N components and M gaps found." (M = open gaps), "Analysis partly finished · X of 5 stages finished…" (same stage rule as the Review progress panel), "Analysis failed · No stages finished…", "New question/mismatch from a developer" quoting their message, "Finding marked implemented · <component property>, marked by a developer on the share link." (lookups scoped to the mark's handoff). Older rows keep their old text. Tested.
- `listNotifications` includes the handoff name.
- Local only: 6 sample notifications inserted on the test account (dispatchers not run because `.env` has a live Resend key).

## Insights (08) — 2026-11-22
- Page rebuilt per Figma: subtitle, Readiness / Drift tabs (link tabs, `?tab=drift`, Drift shows its count), "Weakest area" heading with open critical/high gap count, "Average readiness" card (thin line on a 0–100% grid, latest value labelled, hover crosshair + "<date> analysis" tooltip, up to four date labels), category table (bar with the 85% = ready marker, critical or high gaps, neutral sparkline), and the "No insights yet" empty state (also shown when handoffs exist but none is analyzed).
- Drift merged in as a tab (no Figma frame for its content; styled to match). Each drift finding now shows its provenance badge, which the old page left out. `/drift` redirects to `/insights?tab=drift`; the Handoffs page and command palette link there.
- Not seen in the browser: the drift list with findings (seed produces none).

## System (11) — 2026-11-22
- 404 and error pages share `components/ui/SystemPage.tsx` (logo top-left, eyebrow, heading, line, two buttons) with Figma's copy.
- Loading: skeletons in the page's shape — `HandoffsLoading`, `HandoffLoading` (real tab labels, canvas block, findings rail) per Figma; Insights and Settings get a titled one-card skeleton. Pulse only with motion allowed. Removed `drift/loading.tsx` (route redirects).
- Toasts per Figma: one at a time (new replaces old), bottom-right desktop / bottom-centre mobile, success and info close after 5s, errors stay until dismissed, optional action (Undo/Retry). "Handoff archived · Undo" wired; DraftScreenList errors now use the error style (were green success toasts). Short confirmations lost their trailing full stops; resolved flags say "The developer will see it."
- Open (pre-existing): `unarchiveHandoff` always sets status to Draft, so an analysed handoff comes back as Draft and Undo isn't a full undo. Needs a decision before changing status rules.
- Not seen in the browser: the error page, the mobile toast position.
- Fixed (user approved "restore status"): `unarchiveHandoff` now rebuilds the status via `lib/handoff-status.ts` (`statusAfterUnarchive`, tested) using the pipeline's rules: run queued/processing → Analyzing; never analysed → Draft; live share link → Shared; latest success partial → NeedsReview; else the readiness gate (NeedsReview/Ready). Score untouched. Archive → Undo verified in the browser (Checkout v3 returned as Shared, which it is: it has a live share link).

## Emails (12) — 2026-11-22
- `lib/email-templates.ts` (new, tested): HTML emails per Figma — table layout, inline styles, PNG logo (`public/logo/buildbridge-logo-email.png`, Gmail/Outlook block SVG), hidden preview text, notification footer with "Turn off emails" → `/settings?tab=notifications`. Every user-supplied value is HTML-escaped (test covers a script/attribute injection). Plain-text twin on every message.
- Templates: Password reset; Analysis finished (screens, components, gaps with critical count in red, readiness — omitted when the app hides it); Partly finished / Didn't finish variants with Figma's subjects, bodies and buttons; Developer flag (which value, the developer's words as a quote, "Open developer feedback" → `?tab=feedback#flag-…`); Marked implemented ("Pay button corner radius (8px) in …").
- `lib/email.ts` sends html + text; `lib/notifications.ts` gathers the run summary and finding names once for both the notification and the email. Flag notifications now open the Developer feedback tab.
- Share-link preview card: `app/share/[token]/opengraph-image.tsx` (1200×630, Inter from `assets/fonts`, OFL). Name, readiness and open critical gaps only; an invalid/expired/revoked token gets the plain logo card. `next.config.mjs` traces the fonts/logo for Vercel.
- Checked by rendering locally (analysis, flag emails; preview card for a live and a bad token). Not sent through Resend.

## Review tabs (04 — Screens / Responsive / Developer feedback / History / Notes) — 2026-11-22
- Each tab opens with Figma's one-line description (`TabIntro`).
- Screens: grid of cards (screen on a grey stage, "1. Cart", component count), "Add screens" (new compact `UploadDropzone variant="button"`) and "Re-analyze" on the right, Figma's footnote. Screen flow editing kept below (not in the Figma frame, but it feeds the share view).
  - "Drag to reorder" left out: reordering is Draft-only (`reorderDraftScreens`).
  - Per-screen gap counts show only when gaps are linked to the screen. Gap detection never links gaps to a screen or component (`NewIssueFinding` has neither), so "0 gaps" would be false. Linking them is an AI schema change — needs a decision.
- Responsive: one table (Rule, Viewport, Source, Status) with inline Confirm/Modify/Reject, "✓ Confirmed", "Modified · was “…”" (from the decision trail, `lib/latestDecisions.ts`), plus a red "Gap" row per open Responsive-behavior gap linking to it. The column shows the viewport category, not Figma's "Under 768px": the analysis never produces pixel breakpoints. Rows now have a fixed order.
- Developer feedback: Figma cards (kind and status chips, what it's about, relative time, "From …", Acknowledge / Mark resolved), resolved folded away, footnote. Flag notifications already link here.
- History: one collapsible card per run, "First analysis" / "Re-analysis · Today, 10:42", counts on the right, "Needs your call" (conflicts, with "you marked “Not a gap” on …"), New, Still flagged. Items link to the gap.
- Notes: add box with "Add note", note cards with what it's about (component/screen/"Whole handoff"), time, edit and delete. New `deleteDesignerNote` action (owner-checked, tested) behind a confirm dialog.
- Not seen in the browser: re-analysis/conflict cards (seed has one run).
- Linked gaps to screens/components (user approved "link gaps"): gap output gains optional `screenName`/`componentName` (schema-validated, max 200), the prompt asks for names copied exactly from the summary, and the summary now lists screen names and which screens each component is on. `resolveFindingLinks` (lib/decisions.ts, tested) maps names to ids only on an exact, unambiguous match in this handoff; otherwise nothing is linked. Touch-target, contrast and consistency checks pass their names too. A gap found again only gains a missing link; an existing one is never replaced. Analysis version 3.
- Verified by re-seeding locally: Checkout v3 12 of 13 gaps linked (the 13th names a component that exists on several screens, so it stays unlinked); Screens tab shows "3 components · 3 gaps" per screen. Gaps on handoffs analysed before this pick up links on their next analysis.
- Local env note: Docker (Redis) wasn't running; the seed finished its data but couldn't exit while retrying Redis.

## Readiness breakdown + keyboard shortcuts (04) — 2026-11-22, branch design/readiness-shortcuts
- "How 78% is worked out" (Figma Readiness breakdown, desktop + 390): the header's readiness line is now a button opening a panel (desktop) or bottom sheet (phone). Built from `explainReadiness()` (lib/readiness.ts, tested against the Figma example) and the formula's own `SEVERITY_DEDUCTIONS`, so the copy can't drift from the score. Categories lowest first, "1 critical gap −40", the averaging line ("= 78.3, shown as 78%"), "Still not ready…" when a critical gap is open, "Formula v1 · …". A category pushed past 0 reads "−100 (stops at 0)" so the sum doesn't look wrong. Formula unchanged.
- Keyboard shortcuts (Figma Keyboard shortcuts): J/K move through gaps, component headers and value rows (opening a closed component, selecting a row); C/M/R press that row's own Confirm/Modify/Reject buttons; ? lists the shortcuts; ignored while typing, with a modifier held, or with a dialog open. Hint bar at the bottom of the findings panel. Not active in guided review.
- ⌘ vs Ctrl: the shortcuts list and sidebar search show "Ctrl K" off Apple devices (`useModKey`).
- Fixed in passing: the closed Ask BuildBridge drawer was still exposed as an open modal dialog (now aria-hidden + inert); decision toasts lost their full stops; Insights uses the shared category labels (`lib/readinessLabels.ts`).

## Finding card footer + re-analysis notice (04) — 2026-11-23, branch design/finding-card-footer
- Each open component card ends with "Add note · Ask about this finding" (Figma). Add note opens a box in the card and saves a note attached to that component (Notes tab shows it by component name; the share view shows it beside the component). Ask about this finding opens Ask BuildBridge with "Asking about <component>" (or "<component> · <value>" when a value is selected) and three templated "Try asking" questions; the question is sent as "About <finding>: …" so the history matches what was asked. The assistant stays the existing drawer; the in-panel assistant from Figma is the separate "assistant states" item.
- "Re-analysis changed N findings · Review changes" at the top of the findings list, and the "Changes from today's re-analysis" panel (Figma Review changes): summary line, Needs your call (conflicts: "You marked this “Not a gap” on …", Keep my decision / Reopen gap), New gaps (link to the gap), Still flagged. `lib/reanalysis.ts` (tested) decides: newest run only, only a re-analysis, shown while a conflict is undecided or a new gap is still open. Keep my decision re-records the same decision (Reject, or Override with the same answer); Reopen gap records Confirm (back in review). No schema change.
- Verified locally with a real second run (fixture AI): 1 conflict + 12 still flagged; Keep my decision cleared the notice.
- Toasts that still ended in full stops (gap decisions, guided review) now match Figma.
