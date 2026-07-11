# BACKLOG.md

Post-MVP work for Gift Card Snapper. The MVP (see `SPEC.md`) is live in
production. This file tracks features and polish deferred past MVP.

Sizes: **S** (hours) · **M** (days) · **L** (1–2 weeks) · **Epic** (multi-week).

---

## Features

### 1. Whitelabeling for brokers — Epic
A branded experience for brokers (logo, colors, possibly a custom domain per
broker).

- Requires a multi-tenant model (broker organizations) and a theming system.
  Theming was deliberately stripped to a single light theme for the MVP, so
  this reintroduces that complexity.
- Foundational dependency for #5 (dual-sheet writes).
- Requirements to be scoped if/when we pursue a broker deal.

### 2. Customizable sheet — M
Let users choose columns, their order, and naming, instead of today's fixed
columns (Date, Vendor, Card Number, PIN, Value, Expiration).

- Append logic becomes config-driven off a per-user column map.
- Mild tension with SPEC principle P-004 ("never ask the user to configure
  what can be automated") — keep it optional with a sensible default so the
  zero-config path is unchanged.

### 3. Opt-in: save snap images to the user's own Google Drive — M
Optionally save the snapped photo into the **user's own** Google Drive
alongside the row(s) it produced.

- Privacy model is preserved: the app still never stores images
  server-side. The image goes only into the user's Drive, the same trust
  model as the spreadsheet (`drive.file` scope — files the app creates in the
  user's Drive).
- Must be explicitly opt-in (off by default).
- Copy note: the "never stored, they only go to your sheet" line would need a
  small tweak (e.g. "…only go to your own Google Drive") to stay accurate when
  the option is on.
- Likely a per-user "Gift Card Images" folder + the image saved and linked
  from its sheet row.

### 4. Feature suggestion / voting — S–M
A place for users to suggest features and vote on them.

- Build-vs-buy decision: a hosted tool (Canny, Featurebase) is fast and cheap
  but off-brand; building in-app means new tables, UI, and moderation.
- Lean toward buy unless we want it fully branded/whitelabeled (ties to #1).

### 5. Dual-write: user's sheet AND the broker's sheet — L
Write each saved card to both the reseller's sheet and the broker's sheet.

- Depends on #1 (broker relationships/model).
- OAuth wrinkle: today's `drive.file` scope only lets the app touch sheets it
  created. Writing to a broker's existing sheet means the broker provisions
  the sheet through the app, or we request a broader (re-consented) scope.
- Adds cross-account write surface — security to be designed carefully.

---

## Tech debt / polish

- **Demo video** — the landing-page demo link was removed (video wasn't
  working and shows the old camera-lens logo). Re-render with the current logo
  and re-add the link when it's ready. The `DemoModal` component
  (`app/demo-modal.tsx`) and `public/demo.mp4` remain in the repo, just
  unlinked.
- **Accessibility lows** deferred from the audit:
  - Heading hierarchy (avoid multiple `h1`s per view).
  - Replace `alert()` calls with in-app toasts.
  - Remaining form-field a11y polish (labels/associations on the review
    screen).

---

## Notes

- `SPEC.md` §4 "Out of Scope" lists items intentionally excluded at MVP (e.g.
  inventory search/history, analytics, CSV export, public API). Several of its
  exclusions have since shipped (multiple plans, referrals, past-due grace),
  so treat that list as historical context, not a live roadmap.
