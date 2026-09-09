# Phase 1 — Acceptance run

Step 10 of `fruitisimo-phase1-plan.md`. The point is not to check that the app
runs — the tests do that — but that **its numbers are worth more than the
calculator's**. That needs a person, a scale, and real produce.

**Exit criterion:** you would trust the app's numbers over the calculator's.

---

## Before you start

- The app is deployed and open on the phone (and on the register PC).
- You have the current paper/Excel sheet to hand, for comparison.
- Start a fresh closing ("Start new closing" if anything is left over).

## Run it twice

One **daily** closing and one **weekly** closing, start to finish, without
using the calculator. Do the daily one on the phone and the weekly one on the
PC (or the other way round) so both get exercised.

For each product, **before** typing anything into the app, work the answer out
the way it's done today and write it down. Then compare.

## Cases to be sure you cover

These are the paths where a mistake would be expensive. If a normal closing
doesn't happen to include one, do it deliberately.

| # | Case | Why it matters |
|---|------|----------------|
| 1 | A **peeled** citrus or melon (Narancs, Grapefruit, Citrom, Lime, Görögdinnye) | The ×1.35 / ×1.4 multiplier — the rule most often done in someone's head |
| 2 | The **same product weighed twice**, e.g. one tray peeled and one whole | The total must equal the two parts added up |
| 3 | The **same product in two different containers** | Different tares deducted in one total |
| 4 | An **ice cream** in the ice cream tray | Grams rather than kilos, and the tray is preselected — check it is the right one |
| 5 | A **counted accessory** with boxes *and* packs *and* loose pieces | 800/karton and 50/csomag arithmetic |
| 6 | A product weighed **with no container** | Nothing deducted |
| 7 | Type a weight with a **comma** (`2,34`) | The phone keyboard's decimal separator |
| 8 | **Refresh the page** halfway through | Everything must come back exactly |
| 9 | **Remove an entry** and re-enter it | Correcting a mistake without redoing the closing |
| 10 | Finish and **export the xlsx** | Numbers must match the screen exactly |

## What to check in the export

- Every total matches what you wrote down by hand.
- A multi-form product shows its parts in the "Measured as" column, and they
  add up to the total.
- Quantities are numbers (you can sum a column in Excel), not text.
- The "Not entered" list matches what you genuinely didn't weigh.

## Sign-off

| Check | Daily | Weekly |
|---|---|---|
| Every total matches the hand calculation | ☐ | ☐ |
| Nothing needed the phone calculator | ☐ | ☐ |
| The xlsx matches the screen | ☐ | ☐ |
| Nothing was lost mid-closing | ☐ | ☐ |
| Faster than today's process | ☐ | ☐ |

**If any total disagrees with the hand calculation, stop and write down the
exact inputs** — product, container, variant, raw reading. That is a bug in the
rules, not a rounding quirk, and it is the whole reason this step exists.

## What the dry run already proved

`components/acceptance.test.tsx` drives a realistic closing through the real UI
— no injected state — and checks the exported figures against arithmetic worked
out by hand:

- Oranges weighed twice: `(2340 − 276) × 1.35 = 2786` and `5000 − 378 = 4622`,
  totalling **7.408 kg**, with the breakdown spelled out.
- Apples in a large plastic tray: `1500 − 393` = **1.107 kg**.
- Peeled watermelon in the deco basket: `(3000 − 600) × 1.4` = **3.36 kg**.
- Vanilla ice cream in the preselected tray: `1200 − 750` = **450 g**.
- Cups: `2 karton + 3 csomag + 4 loose` = **1754 db**.
- A wrong entry removed, leaving the rest of the closing intact.

So the arithmetic is not what the live run is testing — the live run is testing
whether the **rules and the workflow** match how Fruitisimo actually closes.
