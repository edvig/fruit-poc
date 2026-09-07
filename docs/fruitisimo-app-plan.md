# Fruitisimo Closing App — Development Plan

## The problem

Every closing, staff weigh every product by hand, deduct container weight, apply
mental-math multipliers (e.g. peeled vs. unpeeled), count items separately, and
do all of the math on a phone calculator — then write/report the results
somewhere. It's slow and error-prone because the rules live in people's heads.

## Architecture (decided, post Phase 0)

- **Frontend:** React (Vite), heavily mobile-responsive. Runs on the PC or phone at
  the register — both confirmed always online, so no offline handling needed. Important to store the filled data into local storage, so a page refresh wont delete the current closing.
- **Backend:** Node.js + Express from day one (not deferred) — one process
  serves both the API and the built React app, so there's a single deploy.
  Reasons to have it now rather than later: xlsx generation and (future)
  email sending are both easier to do server-side, and it gives a natural
  home for config even before there's a database.
- **Config, not hardcoding:** products/containers/multipliers live in an
  editable JSON file read by the backend (e.g. `config/products.json`,
  `config/containers.json`) — editable directly without touching app code.
  A future admin UI (Phase 3) would just read/write the same file, or migrate
  it into a database if it grows unwieldy.
- **No database (for now):** confirmed no history needs to be kept — results
  are hand-copied into the Czech accounting system after each closing.
  Persistence can be added later without touching the calculation logic.
- **Report export:** a single-sheet xlsx summary (item → total, with a
  breakdown when an item has multiple measured forms) generated server-side.
  Deliberately _not_ trying to mirror the existing multi-sheet Daily/Weekly/
  Monthly template yet — start simple, refine once the simple version is in
  use. Email delivery of the xlsx is a known future step, not now.
- **Hosting:** Render's free web-service tier (Node/Express + built React app
  in one deploy). Free, and fine for ~1-2 uses/day; the tradeoff is a cold
  start (~30-50s) after 15 minutes idle, which is a non-issue at this usage
  level. Moving off free tier later ($7/mo-class) removes the cold start if
  it ever becomes annoying. Vercel was tried but isn't the pick going forward.
- **Auth:** none needed while it's one register; revisit in Phase 4 if
  multiple stores/registers arrive.

## What Phase 0 actually found (real data, not placeholders)

- Full product list, categories, and daily/weekly/monthly tiers: `items.md`.
- Container tare weights (Metal: mini 19g → ice cream tray 750g; Plastic:
  small 263g / large 393g; Deco basket 600g): `containers.md`.
- Multipliers apply only to peeled citrus/melon (Narancs, Grapefruit, Dinnye,
  Citrom, Lime), are **greater than 1** (1.35-1.4×) — they scale a peeled
  weight _up_ to a whole-fruit equivalent — and are applied **after** tare
  deduction: `net = (raw − tare) × multiplier`.
- A product measured in multiple forms (e.g. some peeled, some not) is
  recorded per-form but summed into one total for the report.
- Open item to double check with Fruitisimo: the monthly sheet in the real
  template (`inventory.xlsx`) includes several categories (coffee, sugar,
  vitrine items, decorations, cleaning supplies) not present in the weekly
  sheet or in `items.md` — worth confirming whether those are in scope.

## Phase 0 — Discovery (no code)

**Goal:** fully understand the real rules before building around guesses.

- Meet Fruitisimo, work through the question checklist (products & units,
  containers & tare weights, multipliers, counted items, current process,
  reporting, environment — see chat for the full list).
- Deliverable: a filled-in product/container/multiplier list, and a sample of
  what a report should contain.
- **Exit criteria:** for every product, you can write down exactly how its
  final quantity is derived from a raw scale reading or a count.

## Phase 1 — Real POC (React + Express, real config)

**Goal:** prove the core calculation logic and interaction model with real
Fruitisimo data — replace the calculator + mental math, nothing else yet.

- React frontend + Express backend, backend serving the real product/
  container/multiplier config from JSON (see "What Phase 0 actually found").
- Closing-type selector: Daily / Weekly / Monthly, each showing the right
  subset of products (daily is a subset of weekly, per the real data).
- Add-entry flow: pick product → pick container (if weighed) → enter raw
  weight → auto-deduct tare → apply the real multiplier (only for the 5
  peeled citrus/melon items) → see the net result before committing it.
- Separate flow for counted items (accessories, vitrine items).
- Multi-form items (e.g. some peeled, some not) recorded per-form, summed
  into one total.
- Running list of the day's entries, editable/removable.
- Single-sheet xlsx export of the summary (item → total, with a per-form
  breakdown where relevant) — no attempt yet to match the full existing
  multi-sheet template.
- Intentionally **no login, no persisted history** — matches the confirmed
  "no need to store this" requirement. Deployed on Render's free tier.
- **Exit criteria:** someone could do a full daily/weekly/monthly closing
  entirely inside the app, download the xlsx, and hand-copy it into the
  Czech system with zero calculator/mental math.

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
