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
- **Status:** done. `components/ProductRow.tsx` expands a row into the form
  the design shows: two-level container picker (group, then size when the
  group has several), variant chips, raw weight, a live net preview, and
  "Add to closing". Counted products get box/pack/loose steppers; the config's
  `amount` products (litres) get a plain amount field. Committed entries appear
  as removable chips under the product, with the product's row showing the
  summed total — the multi-form case from Phase 0.
- Entry model lives in `lib/entries.ts`; `lib/format.ts` writes quantities
  (kilos to the gram, counts whole). Container and form stay selected after
  adding, since several trays of one product in a row is the normal case.
- Verified by component tests driving the real UI (`ProductRow.test.tsx`,
  React Testing Library): the peeled-orange case typed **with a comma** —
  Hungarian keyboards give `2,34`, not `2.34` — previews `Net 2.786 kg` and
  commits `netGrams: 2786`, matching Step 3 exactly; the ice cream tray is
  preselected and deducts its 750 g; boxes and packs multiply up (2 karton +
  1 csomag = 1650 db); a weight below the container's tare is refused with the
  Add button disabled. 48 tests pass.

## Step 6 — Session persistence (localStorage)
**Goal:** a page refresh or a phone locking mid-closing doesn't lose work.
- Entries (plus the selected closing type/date) persist to localStorage as
  they're added/edited/removed, and rehydrate on load.
- A clear "reset/start new closing" action, since localStorage otherwise
  never forgets on its own.
- **Done when:** mid-closing, a refresh (or closing and reopening the browser
  tab) restores exactly where you left off.
- **Status:** done. localStorage is wired as a React external store
  (`lib/session-store.ts` + `useSyncExternalStore`), so the saved closing is
  read during render rather than copied into state by an effect — no
  first-render flash of an empty closing, and no risk of the empty initial
  state overwriting saved work. `lib/session.ts` holds the pure parse/
  serialise half.
- Three cases that would otherwise bite in the shop:
  - **A closing left over from another day** is restored but flagged with a
    banner naming its date and a "Start new" button, rather than silently
    presenting yesterday's numbers as today's. It is not auto-discarded
    either, since a closing can legitimately cross midnight.
  - **Safari private mode / full quota** throws on write; the store falls back
    to memory so the closing keeps working for the session instead of dropping
    every entry.
  - **Entries whose product left the config** (config changes between
    deploys) are dropped on load and reported, rather than becoming invisible
    but still counted.
- "Start new closing" asks before deleting, and sits at the end of the list,
  away from the taps staff make constantly.
- Verified by component tests that mount, enter a weight, throw the component
  away and mount again — the entries, the totals and the selected closing type
  all come back. 69 tests pass.

## Step 7 — Entries list & summary
**Goal:** see and correct what's been entered, and see the running totals.
- Editable/removable list of today's entries.
- Summary totals per product, with multi-form items (e.g. peeled + unpeeled
  orange) shown broken down as well as summed.
- **Done when:** the summary total for a multi-form item matches the sum of
  its individual entries, and any entry can be corrected without redoing the
  whole closing.
- **Status:** done. `/summary` is a second screen, following the
  `Summary.dc.html` artboard: entered/not-entered stat row, one line per
  entered product grouped as on the entry screen, and a "Not entered" list of
  everything still outstanding. A per-form breakdown appears **only** when a
  product has more than one entry, so single-entry products stay uncluttered.
- Following the design, the summary is a read-only snapshot — correction
  happens on the entry screen, which already has removable per-entry chips.
  Missing products are listed but don't gate anything.
- `lib/summary.ts` builds the model as a pure function, so the totals are
  testable without a screen; `lib/labels.ts` describes an entry ("Peeled ·
  2.786 kg", "2 karton + 1 csomag + 7 loose") and is shared with the entry
  chips so the two can't drift.
- Verified: the multi-form orange totals 7.408 kg and its parts sum to exactly
  7408 g; the missing list scopes itself to the selected closing type; entries
  for products outside the tier are ignored. 145 tests pass.

## Step 8 — xlsx export
**Goal:** get the report out of the app and into a file.
- Server endpoint takes the current summary and returns a single-sheet xlsx
  (item → total, with per-form breakdown where relevant) — not attempting to
  match the full multi-sheet template yet, per the earlier decision.
- Client triggers a download after a closing is finished.
- **Done when:** a downloaded file opens cleanly in Excel/Sheets and the
  numbers match the on-screen summary exactly.
- **Status:** done. `POST /api/export` takes the closing (entries, tier, date)
  and returns a single-sheet xlsx; the "Export .xlsx" button on `/summary`
  downloads it. `write-excel-file` was picked over `exceljs` and SheetJS's
  `xlsx` — both pull known vulnerabilities (`exceljs` a vulnerable `uuid`,
  `xlsx@0.18.5` its own advisories), this one audits clean with zero
  dependencies.
- **The server recomputes the totals** from the posted entries using its own
  config, rather than trusting numbers the browser calculated. The file can
  then never disagree with the rules the app is built on, and it's the same
  code path the screen uses.
- Sheet layout: title row (closing type + date), header row, then products
  grouped under their category heading with the per-form breakdown spelled out
  where a product has several entries, then a "Not entered (n)" section.
  Quantities are written as real **numbers** with a per-unit format (kg to 3
  decimals, counts whole), so the sheet can be summed and checked rather than
  being a picture of a table.
- `lib/export.ts` builds the rows as plain data, independent of the writing
  library, so the contents are testable without unzipping a workbook.
- Verified by generating a real file through the running server and reading
  the cells back out of it: `Narancs 7.408 kg` with
  `Peeled · 2.786 kg + Whole · 4.622 kg` beside it, `Alma 1.107`, `Vanília
  450 g`, `Not entered (34)`, sheet tab named `Daily 2026-09-08`, and `file(1)`
  identifying it as a genuine `Microsoft Excel 2007+` workbook. 158 tests pass.
- Not yet checked on a phone: the blob download path (iOS Safari). That
  belongs to Step 9's mobile pass.

## Step 9 — Mobile pass
**Goal:** a dedicated review pass specifically on a phone, not just
"responsive by accident."
- Actually run through a full closing on a phone screen, not just resize a
  browser window.
- Check touch target sizes, keyboard behavior on numeric inputs, and that
  nothing important is off-screen or requires zooming.
- **Done when:** a full closing can be done on a phone one-handed, without
  mis-taps, from a stand-still.
- **Status:** the automated half is done; final sign-off still needs a real
  phone (see below). Audited by driving the actual Chrome on the dev machine
  over the DevTools Protocol at an iPhone 14 viewport (390×844, DPR 3, touch
  emulation) — no extra dependency, just Node's built-in WebSocket.
- **Found and fixed — every tap target now clears the 44px iOS minimum:**
  - Daily/Weekly/Monthly tabs were 36px tall.
  - All/Missing filter chips were 30px.
  - Container, size and variant chips were 38px.
  - **Entry remove buttons were 24×24** — the smallest target in the app and
    the only destructive one. The light 24px circle is kept, but the button
    around it is now a full 44×44 hit area.
  - "Back to entry" on the summary was a 20px-tall bare text link.
  - **"Review & export" collapsed to 23px** once the list got long (reported
    from the phone, and reproduced in the audit). It is a flex child in a
    column container, so it was being squashed: `h-12` sets a height but
    doesn't stop shrinking — it needed `flex-none`. Now a solid 48px with all
    38 rows expanded. The reset button had the same latent bug.
- Also addressed: `env(safe-area-inset-bottom)` padding so the export button
  and the end of the list clear the iPhone home indicator, and expanding a row
  now scrolls it into view (`block: "nearest"`) so the form doesn't open below
  the fold where the keyboard covers it.
- Verified clean: no horizontal overflow on either screen at 390px, the
  viewport meta allows zooming to 5×, and every input computes to ≥16px so iOS
  doesn't zoom the page on focus.
- **Still needs a real phone, and cannot be checked from here:**
  - Whether the xlsx blob download works in iOS Safari (flagged in Step 8).
  - Real keyboard behaviour: does the decimal keypad appear, and does the
    layout survive it opening over a expanded row.
  - One-handed reach and mis-taps with wet or cold hands at the actual scale.

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
