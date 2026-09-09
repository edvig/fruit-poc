# Fruitisimo Closing App — Development Plan

## The problem

Every closing, staff weigh every product by hand, deduct container weight, apply
mental-math multipliers (e.g. peeled vs. unpeeled), count items separately, and
do all of the math on a phone calculator — then write/report the results
somewhere. It's slow and error-prone because the rules live in people's heads.

## Architecture (decided, post Phase 0)

- **Frontend:** React via Next.js (App Router, TypeScript), heavily mobile-responsive.
  Runs on the PC or phone at
  the register — both confirmed always online, so no offline handling needed. Important to store the filled data into local storage, so a page refresh wont delete the current closing.
- **Backend:** Next.js route handlers (`app/api/*`) from day one (not
  deferred) — the same project serves both the API and the UI, so there's a
  single deploy. Reasons to have a backend now rather than later: xlsx
  generation and (future) email sending are both easier to do server-side,
  and it gives a natural home for config even before there's a database.
- **Config, not hardcoding:** products/containers/multipliers live in an
  editable JSON file read by the backend (e.g. `config/products.json`,
  `config/containers.json`) — editable directly without touching app code.
  A future admin UI (Phase 3) can't write that file back, though — serverless
  hosting has a read-only filesystem — so self-serve editing means moving the
  config into a database at that point.
- **No database (for now):** confirmed no history needs to be kept — results
  are hand-copied into the Czech accounting system after each closing.
  Persistence can be added later without touching the calculation logic.
- **Report export:** a single-sheet xlsx summary (item → total, with a
  breakdown when an item has multiple measured forms) generated server-side.
  Deliberately _not_ trying to mirror the existing multi-sheet Daily/Weekly/
  Monthly template yet — start simple, refine once the simple version is in
  use. Email delivery of the xlsx is a known future step, not now.
- **Hosting:** Vercel's free tier — Next.js is Vercel's own framework, so it's
  zero-config, and the pages are served static from a CDN with only the API
  running as serverless functions. **No idle cold start**, which matters
  because this gets demoed: an app that makes you wait ~30-50s on the first
  request demos badly. Render (a long-running Express process) was the earlier
  pick and is the better shape for a heavy production backend, but its free
  tier sleeps after 15 minutes idle. Revisit if this ever stops being a demo:
  serverless means no persistent process, no writable filesystem, and Phase 2's
  database has to be a serverless-friendly one (Neon / Supabase / Vercel
  Postgres) rather than a plain connection pool.
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

## Phase 1 — Real POC (Next.js, real config)

**Goal:** prove the core calculation logic and interaction model with real
Fruitisimo data — replace the calculator + mental math, nothing else yet.

- Next.js frontend + route handlers serving the real product/container/
  multiplier config from JSON (see "What Phase 0 actually found").
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
  "no need to store this" requirement. Deployed on Vercel's free tier.
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
- **A third product state — "Done".** Today a product is either _not entered_
  or _entered_, which conflates "one tray is on the scale" with "this one is
  finished". A product measured in several forms sits in between, and with
  38-132 products in a closing, "what is genuinely left?" is the question the
  screen should answer. Shape: a tick/toggle on the row marks it Done, which
  closes the entry form so nothing can be added by accident; sliding it back
  returns it to _entered_ and re-opens the form, deleting nothing. Progress
  would then count Done rather than merely entered, and the filter chips
  become All / Missing / Done. **The cost is taps** — an explicit tick is one
  extra tap per product (132 on a monthly closing) for products that usually
  have exactly one entry, so it's worth deciding between an explicit tick, an
  auto-Done on first entry that staff slide back, or a "mark everything
  entered as Done" sweep at the end. Deliberately parked out of Phase 1 to
  keep the POC simple.
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

## Decisions locked in (2026-09-07)

Four open points settled before Phase 1 Step 1 starts:

1. **Stack: Next.js + Vercel, rebuilt from scratch.** The pre-Phase-0 POC
   (`components/FruitisimoClosingPOC.jsx`, placeholder products with
   multipliers < 1) is retired — its data contradicts what Phase 0 found. The
   framework choice went back and forth: the post-Phase-0 plan said Vite +
   Express on Render, and that was built and working, but it was replaced with
   Next.js + Vercel because **this is a demo and Render's free tier cold start
   would be visible during it**, and because Next.js is the familiar ground
   here. Scaffold is Next.js 16 (App Router) + React 19 + TypeScript +
   Tailwind 4. The old POC stays in git history as a reference for the
   entry-flow UI shape.
2. **Monthly = the full `Havi Leltár` sheet**, not a copy of weekly: it also
   covers VITRIN (cake cups, snack bowls, muffins, drinks), SZELETEK,
   DECOS/packaging, KÁVÉ, sugar, and cleaning supplies — all counted (`db`) —
   plus frozen fruit tracked per package size (`Fagyasztott áfonya 2,5kg`
   etc.), which pairs with the workbook's separate "opened packages" sheet.
   **Built:** the open questions at the end of `items.md` were answered, so
   monthly is now in the config alongside daily + weekly — 132 products, every
   daily/weekly item plus VITRIN, SZELETEK, the rest of DECOS, EGYÉB and
   KÁVÉ.
3. **Counted items are entered as cartons + packs + pieces**, auto-multiplied
   into one piece total using the pack sizes written into the sheet's own
   labels (e.g. `Pohár 0,3 — 800/karton, 50/csomag`). This removes mental math
   that today happens on the calculator. Pack sizes become config data and
   need one confirmation pass with Fruitisimo.
4. **English UI, Hungarian data.** All interface text in English; product,
   category, and container names stay exactly as Fruitisimo writes them
   (`items.md` / the xlsx), since those are what staff read off the sheet and
   what gets hand-copied into the Czech system.

### Data cleanups — resolved in Step 2

- **Name drift** between the daily and monthly sheets: resolved in `items.md`,
  which now carries one canonical name per product (the monthly spellings —
  "Barackos joghurt", "Kókusz vegan", "Cukormentes … szorbet"). The config
  follows `items.md`.
- **Name collisions** across fresh and frozen (eper, mangó, ananász, gyömbér):
  distinct ids (`fresh-eper` / `frozen-eper`), separate report lines.
- **"Szezonális fagyi" ×3**: three `seasonal: true` slots, to be named by staff
  at entry rather than fixed products.
- **Units** differ by category (fruit kg, ice cream g, accessories db) while
  every tare is grams. Config records the display unit per product; Step 3's
  engine does the conversion, working in one internal unit.
- **Litres on the monthly sheet** (milk, coconut drink, agave syrup) are
  neither a scale reading nor a piece count, so they got a third product kind:
  `amount` — a quantity typed straight in, no container and no pack math. The
  engine refuses to convert `l` to grams rather than assuming a density.

- **Pack sizes: use the monthly sheet's figures.** Where the two sheets
  disagree, monthly isn't a contradiction — it just lists an extra option the
  daily/weekly sheet omits. So `Lyukas pohártető` is 800/karton + 50/csomag,
  and `Szívószál` is 5000/karton + 500/csomag. **karton = box, csomag = pack,
  and a karton is always the bigger of the two** — the config validator now
  enforces that packs are ordered largest first, so a future entry can't
  silently invert them.

### Still open

- **"No container".** The config offers a zero-tare option for anything
  weighed straight on the scale. Confirm that actually happens.
- **Two monthly rows are marked kg although they look like piece goods**
  (`Katicabogár` 340/doboz, `Vakond lefolyó tisztító`). Configured as weighed,
  per the sheet, pending a check with staff.
- **How the monthly `amount` (litre) rows are actually taken** — counted
  cartons, or an estimate of what's left. Affects nothing in the config, but
  decides what the entry screen should ask for.
- **Default containers.** Ice cream defaults to the ice cream tray (750g).
  Whether any fresh or frozen fruit has a standard tray is unconfirmed, so
  they have none.

**Where we are:** Phase 0 is done (see `fruitisimo-phase0-discovery.md`).
Phase 1 is broken into steps in `fruitisimo-phase1-plan.md`; Step 1
(scaffolding), Step 2 (real config), Step 3 (the calculation engine, with
tests), Step 4 (closing-type switcher and product list), Step 5 (the entry
flow) and Step 6 (localStorage persistence) are built and verified locally,
with the first Vercel deploy still to happen. Steps 7 (review screen) and 8
(xlsx export) are done too, so the whole closing — enter, review, export —
works end to end, and Step 9's mobile pass is confirmed on a real iPhone. Only
Step 10 (the end-to-end acceptance run with real quantities) remains.
