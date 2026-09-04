# Phase 0 — Discovery

**Where you're starting from:** you've seen the products in the shop but not a
full closing yet, and this is your first real look at the process. You're
meeting both the owner/manager and the register staff — good, because they'll
know different halves of this (owner: what the numbers are *for*; staff: how
the numbers actually get produced day to day).

**Goal of Phase 0:** leave the meeting able to write, for every single
product, the exact formula that turns a raw scale reading (or a count) into
the number that goes on the report. If you can't yet write that formula for
something, Phase 0 isn't done for that item.

**How to use this doc:** it's a script for the meeting, split into what to
ask *and* what to watch. Fill in answers directly under each question as you
go — by the end this becomes your spec for Phase 1's real config.

---

## 0. Before you ask anything: watch a real closing if you can

You haven't seen one yet, so if it's at all possible to sit in on an actual
closing (even partially) before or during your visit, do that first — it'll
make every question below sharper, and you'll likely spot rules nobody thinks
to mention because it's second nature to them.

While watching, note:
- The literal sequence of physical actions (what gets weighed first, what's
  typed where, what's written down).
- Every time someone pauses to do math in their head or reach for the phone
  calculator — that's a rule to capture.
- Any moment of hesitation or "wait, is this the peeled one or not" — that's
  a rule that's easy to get wrong, which makes it a priority for the app.

---

## 1. Product list & categories
*(ask staff — they touch this daily; owner may not know every SKU)*

- [ ] Full list of everything weighed or counted at closing. Ask if a
      spreadsheet, price list, or POS export already exists rather than
      dictating it from memory.
- [ ] For each product: is it weighed, or counted?
- [ ] For each weighed product: does it ever get sold/measured in more than
      one form (peeled vs. not, sliced vs. whole, with syrup vs. without)?
- [ ] Are there products that are *sometimes* weighed and sometimes counted
      depending on how they're sold that day?
- [ ] Anything seasonal — products that only exist part of the year, or whose
      rules change by season?

**Answers:**


---

## 2. Containers & tare weights
*(ask staff, ideally while looking at the actual containers)*

- [ ] Every container/tray type used, with its empty weight. Best case: they
      weigh an empty one with you on the spot rather than recalling a number.
- [ ] Is tare weight per container type fixed, or does it vary (wear,
      different batches/suppliers, wet vs. dry)?
- [ ] How is the "correct" tare currently chosen — memorized, written on a
      chart taped to the scale, guessed? (This tells you how error-prone the
      current method is, and what the app needs to make foolproof.)
- [ ] Do containers ever get mixed for one product (half in a small tray,
      half in a large one) — and if so, how is that currently handled?

**Answers:**


---

## 3. Peeling / multiplier rules
*(ask staff for the numbers, owner for where the numbers came from)*

- [ ] Every multiplier currently applied (peeled/unpeeled is the one you
      already know about — ask what else exists: waste %, melted-ice
      adjustment for ice cream, core/seed removal, etc.).
- [ ] For each multiplier: where did the number come from? Official
      supplier/nutrition data, or an informal estimate staff arrived at over
      time? (Matters for how confidently you can hardcode it, and whether
      it's worth revisiting.)
- [ ] Do multipliers ever change — by season, by supplier, by batch — or are
      they constants?
- [ ] Are multipliers applied to the *raw* weight or the *tare-deducted*
      weight? (i.e. is the order: weigh → subtract tare → multiply, or weigh
      → multiply → subtract tare? This changes the math.)

**Answers:**


---

## 4. Counted items
*(ask staff)*

- [ ] Confirm the full list of counted (not weighed) items — you noted
      desserts and cups already; is that the complete set?
- [ ] Do counted items ever need a sub-category (flavor, size, topping) that
      matters for the report, or is a flat count enough?
- [ ] Is there ever a "partial" count situation — e.g. a half-used batch of
      something that's normally counted whole?

**Answers:**


---

## 5. Current process, end to end
*(ask staff — walk through one full closing step by step, in order)*

- [ ] Have them narrate (or better, act out) a full closing exactly as done
      today: what's weighed first, what's typed into the calculator, what's
      written down, in what order.
- [ ] How many people typically do the closing — one, or split between
      people/registers?
- [ ] Roughly how long does closing take today, and where does the time
      actually go (the weighing itself, the mental math, the writing it
      down)?
- [ ] What mistakes happen most often today, and how are they caught (or
      not)?

**Answers:**


---

## 6. Reporting
*(ask owner — they're the consumer of this)*

- [ ] Who receives the end-of-day report, and what do they do with it
      (bookkeeping, inventory, both, something else)?
- [ ] Is there an existing report or template already in use — even a paper
      one — that the app's output should resemble?
- [ ] What does the report need to show per product: just the final
      quantity, or also raw weight / container / multiplier used, for
      auditing?
- [ ] Does it need to connect to anything else — accounting software,
      inventory system, the POS — now or later?
- [ ] How far back do they ever need to look up an old report?

**Answers:**


---

## 7. Environment
*(ask both)*

- [ ] What device(s) are actually available at the register (you're building
      a web app — confirm there's at least one phone, tablet, or computer
      it'll realistically run on)?
- [ ] Is Wi-Fi/internet reliably available at closing time? (You'd assumed
      yes, online-only — worth a real confirmation on-site.)
- [ ] Single location today — any concrete plan or timeline for more
      registers or stores, or is that purely hypothetical for now?

**Answers:**


---

## Exit checklist

Phase 0 is done when you can check off all of these:

- [ ] Every product has a name, a type (weighed/counted), and — if weighed —
      every variant/multiplier it can have.
- [ ] Every container has a name and a tare weight, and you know how staff
      pick the right one today.
- [ ] You know the exact order of operations for the weight → net-quantity
      calculation (tare then multiply, or multiply then tare).
- [ ] You have a real or sample report to match the POC's output against.
- [ ] You've confirmed the device and connectivity assumptions the POC was
      built on.
