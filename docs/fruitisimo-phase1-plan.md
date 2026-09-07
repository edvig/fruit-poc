# Phase 1 — Implementation Plan

Real POC: Next.js (React + route handlers), real Fruitisimo config,
mobile-friendly, localStorage-backed session, single-sheet xlsx export,
deployed on Vercel free tier. No login, no database, no history.

This doc breaks Phase 1 into steps we'll build **one at a time** — each step
has its own goal and a clear "done when," so we're never touching five things
at once. Check a step off before moving to the next.

---

## Step 1 — Project scaffolding & deploy pipeline
**Goal:** a boring, empty, but fully working skeleton — deployed — before any
real feature exists. Deployment problems are much cheaper to find now than
after Step 8.
- Remove the retired pre-Phase-0 POC (`components/FruitisimoClosingPOC.jsx`
  and its placeholder data) — its rules contradict what Phase 0 found.
- Scaffold: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4,
  `app/` for pages and `app/api/*` for route handlers. UI text in English,
  product/container names in Hungarian as written by Fruitisimo.
- Mobile basics in the base stylesheet from the start: 16px minimum on inputs
  (or iOS zooms the page on every weight entry), no double-tap zoom, `dvh`
  heights. The real mobile pass is Step 9; these are the ones that are
  annoying to retrofit.
- One API route: `GET /api/health` returning `{ ok: true }`.
- The page fetches `/api/health` on load and shows the result — proves the
  two sides actually talk to each other.
- Push to Vercel free tier (zero-config for Next.js), confirm it builds and
  responds.
- **Done when:** the Vercel URL loads on both a PC browser and a phone
  browser, and shows the health check succeeded.
- **Status:** built and verified locally (build, lint, typecheck, and the
  running server all pass). Awaiting the first push + Vercel import.

## Step 2 — Real config data
**Goal:** turn `items.md` / `containers.md` into structured data the app can
actually read, with a schema that has room for everything Phase 0 found
(daily/weekly/monthly tiers, weighed vs. counted, variants/multipliers).
- `config/products.json` — each product: id, display name, kind
  (`weight` | `count`), which closing tiers it belongs to (daily/weekly/
  monthly), and variants if any (e.g. peeled, with its multiplier).
- `config/containers.json` — id, display name, tare weight.
- Counted products carry their pack sizes (pieces per `karton` = box, per
  `csomag` = pack, largest first) so the entry flow can do box/pack → piece
  math. Where the daily/weekly and monthly sheets differ, the monthly figures
  win — they list the extra option rather than contradicting.
- All three tiers: **daily + weekly** come from the `Napi leltár` sheet
  (weekly-only items are the differently coloured cells), **monthly** from
  `Havi Leltár`. Monthly is a superset — every daily/weekly product carries the
  monthly tier too, and monthly adds VITRIN, SZELETEK, the rest of DECOS,
  EGYÉB and KÁVÉ.
- Resolve the known data cleanups listed in `fruitisimo-app-plan.md`: name
  drift between sheets, the four fresh/frozen name collisions, the seasonal
  blank slots, and per-category units (kg / g / db) vs. gram tares.
- `GET /api/config` returns both, merged, for the client to consume.
- **Done when:** hitting `/api/config` returns the full real product and
  container list for all three tiers, matching `items.md`, `containers.md`,
  and both sheets of `inventory.xlsx`.
- **Status:** done. `config/products.json` (132 products: 18 fresh, 13 frozen,
  23 ice cream, 27 DECOS, 14 vitrin, 4 szeletek, 28 egyéb, 5 kávé — 38 daily,
  58 weekly, all 132 monthly) and `config/containers.json` (9 real containers +
  a "No container" option) are served by `GET /api/config`, loaded through
  `lib/config.ts`. Output was diffed programmatically against `items.md` and
  `containers.md`, category by category, and matches on every one.
- Two schema additions the monthly sheet forced: a third kind, `amount`, for
  the litre rows (typed in directly — no scale, no pack math), and
  `defaultContainer`, settable per group or per product, which pre-selects the
  ice cream tray for all 23 flavours.

## Step 3 — Calculation engine (no UI yet)
**Goal:** get the actual math right and provable, independent of any screen.
- A small pure function: `computeNet({ raw, tare, multiplier }) → net`,
  implementing the confirmed order: `(raw − tare) × multiplier`.
- A handful of hand-checked examples from Phase 0 (e.g. a peeled orange, a
  plain apple in a small metal tray) written down as test cases.
- Also covered here, since they're the same kind of arithmetic: box/pack →
  piece counting for accessories, summing a multi-form product into one
  total, and naming the "raw weight is below the container's tare" mistake
  (i.e. the wrong container was picked) instead of returning a negative.
- **Done when:** the function is correct on every hand-checked example — this
  is the piece that most needs to be right before any UI gets built on top
  of it.
- **Status:** done. `lib/calc.ts` holds the engine, `lib/calc.test.ts` 23
  tests (`npm test`, vitest). It works in grams throughout — the one unit the
  source data agrees on, since every tare is grams while products are read in
  kg or g — converting only at the edges. Results round to the nearest gram,
  which also absorbs floating-point dust (`2.675 * 1000` is not exactly 2675).
  Tests were checked against a deliberately broken engine: reversing the order
  of operations fails 5 of them, so they have teeth. `lib/config.test.ts`
  covers the `defaultContainer` resolution added in `containers.md` (ice cream
  group → ice cream tray).
- **Review pass (during Step 4):** the engine survived the config growing to
  132 products, 8 groups and the new `l` unit / `amount` kind — `toGrams` and
  `fromGrams` reject volumes explicitly rather than silently returning
  `undefined`. One gap found and closed: counts had no counterpart to
  `checkWeightEntry`, so `checkCountEntry` now rejects fractional and negative
  box/pack/piece counts.

## Step 4 — Closing-type & product selection UI
**Goal:** get to the right product list for the right closing, on a phone
screen.
- Daily / Weekly / Monthly switcher at the top.
- Product list filtered to the selected tier, grouped the way `items.md`
  groups them (fresh fruit, frozen, ice cream, accessories).
- Mobile-first layout from the start here, not retrofitted later — this is
  the screen staff will actually be looking at while standing at the scale.
- **Done when:** switching closing type correctly filters the product list,
  and it's comfortably usable one-handed on a phone.
- **Status:** built. `components/ClosingScreen.tsx` follows the design canvas
  in `design/fruitisimo-closing/` — sticky header with Daily/Weekly/Monthly
  tabs, progress bar, All/Missing chips, then collapsible groups with emoji.
  `app/page.tsx` is a server component that reads the config and passes it as
  props, so the product list is in the HTML on first paint (no spinner, no API
  round trip before staff can start). Verified against the rendered markup:
  the Daily view shows exactly 38 rows across 3 groups, with accessories
  correctly absent (weekly-only) and no monthly-only product leaking in.
  Product rows are static for now; Step 5 turns them into the accordion the
  design shows, rather than shipping a tap affordance that does nothing.
  The one-handed phone check belongs to Step 9.

## Step 5 — Entry flow
**Goal:** the actual "weigh → get a number" interaction.
- Pick a product → if weighed: pick container, enter raw weight, pick
  variant if the product has one, see the live computed net (using Step 3's
  engine) before adding it.
- If counted: cartons + packs + pieces inputs, summed into one piece total
  using the product's configured pack sizes (a plain +/- for items with no
  pack size).
- "Add to closing" commits the entry.
- **Done when:** every product type (plain weighed, weighed-with-variant,
  counted) can be entered correctly, matching Step 3's test cases.

## Step 6 — Session persistence (localStorage)
**Goal:** a page refresh or a phone locking mid-closing doesn't lose work.
- Entries (plus the selected closing type/date) persist to localStorage as
  they're added/edited/removed, and rehydrate on load.
- A clear "reset/start new closing" action, since localStorage otherwise
  never forgets on its own.
- **Done when:** mid-closing, a refresh (or closing and reopening the browser
  tab) restores exactly where you left off.

## Step 7 — Entries list & summary
**Goal:** see and correct what's been entered, and see the running totals.
- Editable/removable list of today's entries.
- Summary totals per product, with multi-form items (e.g. peeled + unpeeled
  orange) shown broken down as well as summed.
- **Done when:** the summary total for a multi-form item matches the sum of
  its individual entries, and any entry can be corrected without redoing the
  whole closing.

## Step 8 — xlsx export
**Goal:** get the report out of the app and into a file.
- Server endpoint takes the current summary and returns a single-sheet xlsx
  (item → total, with per-form breakdown where relevant) — not attempting to
  match the full multi-sheet template yet, per the earlier decision.
- Client triggers a download after a closing is finished.
- **Done when:** a downloaded file opens cleanly in Excel/Sheets and the
  numbers match the on-screen summary exactly.

## Step 9 — Mobile pass
**Goal:** a dedicated review pass specifically on a phone, not just
"responsive by accident."
- Actually run through a full closing on a phone screen, not just resize a
  browser window.
- Check touch target sizes, keyboard behavior on numeric inputs, and that
  nothing important is off-screen or requires zooming.
- **Done when:** a full closing can be done on a phone one-handed, without
  mis-taps, from a stand-still.

## Step 10 — End-to-end acceptance
**Goal:** confirm Phase 1's exit criteria for real, not just "it should work."
- Run one full realistic daily closing and one weekly closing, start to
  finish, on both the PC and the phone, using real quantities.
- Compare the resulting xlsx against what would've come out of the
  calculator + mental math process.
- **Done when:** you'd trust the app's numbers over the calculator's.

---
**Working order:** steps are listed in the order we'll build them — each one
depends on the last. We'll do one step per session, confirm it's "done when,"
then move to the next.
