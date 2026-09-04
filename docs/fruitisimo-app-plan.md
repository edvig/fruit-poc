# Fruitisimo Closing App — Development Plan

## The problem

Every closing, staff weigh every product by hand, deduct container weight, apply
mental-math multipliers (e.g. peeled vs. unpeeled), count items separately, and
do all of the math on a phone calculator — then write/report the results
somewhere. It's slow and error-prone because the rules live in people's heads.

## Architecture (recommended)

- **Frontend:** Web app (React), mobile-responsive. Chosen over native because
  it's your stronger stack and distribution is trivial — just a URL, no app
  store, works on whatever device is at the register (phone, tablet, PC).
- **Backend (from Phase 2):** Lightweight REST API (Node/Express) + a small
  relational database (Postgres, or SQLite if kept very simple). One store,
  one register at first — schema still models `store_id` / `register_id` from
  day one so multi-store later isn't a rewrite.
- **Core entities:** `Product` (name, unit, type: weighed/counted),
  `Container` (name, tare weight), `Variant/Multiplier` (per product — e.g.
  peeled/unpeeled), `ClosingEntry` (product, container, variant, raw value,
  computed net, timestamp), `ClosingSession` (a day's closing), `Report`.
- **Hosting:** simple platform (Vercel/Render/Railway-class) — no need for
  more than that at this scale.
- **Auth:** none needed while it's one register; add a simple login/PIN in
  Phase 4 when multiple people/stores are involved.

## Phase 0 — Discovery (no code)

**Goal:** fully understand the real rules before building around guesses.

- Meet Fruitisimo, work through the question checklist (products & units,
  containers & tare weights, multipliers, counted items, current process,
  reporting, environment — see chat for the full list).
- Deliverable: a filled-in product/container/multiplier list, and a sample of
  what a report should contain.
- **Exit criteria:** for every product, you can write down exactly how its
  final quantity is derived from a raw scale reading or a count.

## Phase 1 — POC / calculator core _(built today, with placeholder data)_

**Goal:** prove the core calculation logic and interaction model — replace
the calculator + mental math, nothing else yet.

- Config-driven product / container / multiplier list (hardcoded placeholder
  data until Phase 0 gives real numbers).
- Add-entry flow: pick product → pick container (if weighed) → enter raw
  weight → auto-deduct tare → apply variant multiplier → see the net result
  before committing it.
- Separate flow for counted items (desserts, cups).
- Running list of the day's entries, editable/removable.
- On-screen summary totals, exportable as plain text.
- Intentionally **no login, no database** — resets on refresh, single
  session. That's fine; it's here to validate the _logic and UX_, not to go
  live.
- **Exit criteria:** someone could do a full closing entirely inside the app
  with zero calculator/mental math, using real Fruitisimo numbers once you
  swap in the config.

## Phase 2 — Persistence & the real report

**Goal:** make it usable for an actual daily closing, not just a demo.

- Add backend + database: store the config (products/containers/multipliers)
  and every day's closing as a real record.
- Build the actual report Fruitisimo needs, once its format is known —
  likely exportable (PDF/CSV) and/or printable, maybe emailed automatically.
- View/edit past closings.
- Basic validation (no negative weights, no missing container, etc.).

## Phase 3 — Usability & self-serve configuration

**Goal:** Fruitisimo can maintain the app without you.

- Admin screens to add/edit products, containers, tare weights, multipliers.
- Search/favorites for the product list if it's long.
- Mobile polish: bigger touch targets, clear error states, resilience to a
  brief network hiccup mid-entry.
- Real acceptance test: have staff do a live closing in the app.

## Phase 4 — Multi-register / multi-store

**Goal:** scale beyond one location, if/when that's needed.

- Register/store selection; per-store config if products differ by location.
- Basic auth/roles (staff vs. owner/admin).
- Cross-store aggregated reporting.

## Phase 5 — Integrations _(optional, later)_

- Export to accounting software.
- POS/inventory system integration.
- Automatic nightly report delivery to the owner.

---

**Where we are:** Phase 0 hasn't happened yet (your meeting). Phase 1 POC is
built alongside this plan using realistic placeholder data — swap in
Fruitisimo's real products/containers/multipliers once you have them, and
the same app should already work.
