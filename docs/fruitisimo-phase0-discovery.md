# Phase 0 — Discovery

**Where you're starting from:** you've seen the products in the shop but not a
full closing yet, and this is your first real look at the process. You're
meeting both the owner/manager and the register staff — good, because they'll
know different halves of this (owner: what the numbers are _for_; staff: how
the numbers actually get produced day to day).

**Goal of Phase 0:** leave the meeting able to write, for every single
product, the exact formula that turns a raw scale reading (or a count) into
the number that goes on the report. If you can't yet write that formula for
something, Phase 0 isn't done for that item.

**How to use this doc:** it's a script for the meeting, split into what to
ask _and_ what to watch. Fill in answers directly under each question as you
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

_(ask staff — they touch this daily; owner may not know every SKU)_

- [x] Full list of everything weighed or counted at closing. Ask if a
      spreadsheet, price list, or POS export already exists rather than
      dictating it from memory.
- [x] For each product: is it weighed, or counted?
- [x] For each weighed product: does it ever get sold/measured in more than
      one form (peeled vs. not, sliced vs. whole, with syrup vs. without)?
- [x] Are there products that are _sometimes_ weighed and sometimes counted
      depending on how they're sold that day?
- [x] Anything seasonal — products that only exist part of the year, or whose
      rules change by season?

**Answers:**
1: I have a list of all products which are measured. see: @./items.md
2: I have this info, included in @./items.md
3: yes, some things get measured separately, but at the end it should be added together. But separate data is good to store for checking later.
4: no, everything is either weighed or counted, not both.
5: not that i know of.

---

## 2. Containers & tare weights

_(ask staff, ideally while looking at the actual containers)_

- [x] Every container/tray type used, with its empty weight. Best case: they
      weigh an empty one with you on the spot rather than recalling a number.
- [x] Is tare weight per container type fixed, or does it vary (wear,
      different batches/suppliers, wet vs. dry)?
- [x] How is the "correct" tare currently chosen — memorized, written on a
      chart taped to the scale, guessed? (This tells you how error-prone the
      current method is, and what the app needs to make foolproof.)
- [x] Do containers ever get mixed for one product (half in a small tray,
      half in a large one) — and if so, how is that currently handled?

**Answers:**
1: find all data in @./containers.md
2: fixed
3: memorized.
4: can be. In the end the given product is summed up, whatever forms they were measured.

---

## 3. Peeling / multiplier rules

_(ask staff for the numbers, owner for where the numbers came from)_

- [x] Every multiplier currently applied (peeled/unpeeled is the one you
      already know about — ask what else exists: waste %, melted-ice
      adjustment for ice cream, core/seed removal, etc.).
- [x] Do multipliers ever change — by season, by supplier, by batch — or are
      they constants?
- [x] Are multipliers applied to the _raw_ weight or the _tare-deducted_
      weight? (i.e. is the order: weigh → subtract tare → multiply, or weigh
      → multiply → subtract tare? This changes the math.)

**Answers:**

- 1: all of the rules, multipliers are in @./items.md
  2: no.
  3: first tare is deducted and then multiplier applied.

---

## 4. Counted items

_(ask staff)_

- [x] Confirm the full list of counted (not weighed) items — you noted
      desserts and cups already; is that the complete set?
- [x] Is there ever a "partial" count situation — e.g. a half-used batch of
      something that's normally counted whole?

**Answers:**

- 1: in @./items.md, 2: no there's not, everything is either counted or measured.

---

## 5. Current process, end to end

_(ask staff — walk through one full closing step by step, in order)_

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

- These questions are much less relevant. What is important is that there are 3 types of closings/auditing (daily, weekly, monthly). Daily is a subset of the weekly/monthly measured products/ counted items. Weekly and monthly are the same, all products are being measured. This information is included in the @./items.md file.

---

## 6. Reporting

_(ask owner — they're the consumer of this)_

- [x] Who receives the end-of-day report, and what do they do with it
      (bookkeeping, inventory, both, something else)?
- [x] Is there an existing report or template already in use — even a paper
      one — that the app's output should resemble?
- [x] What does the report need to show per product: just the final
      quantity, or also raw weight / container / multiplier used, for
      auditing?
- [x] Does it need to connect to anything else — accounting software,
      inventory system, the POS — now or later?
- [x] How far back do they ever need to look up an old report?

**Answers:**

- 1: two things:
  -- One is that is it written and applied in the czech system for further accounting (just product type and quantities - from items with multiple values just the sum.) Here it would be enough to have a nice summary always at the end of the page showing item - value pairs and maybe listing the missing ones.
  -- Two: would be cool to send an xlsx file to an email address. but this can be future improvement.
- 2: Yes, included in "@./inventory.xlsx file (this is the end product, could be the one to send in email.)
- 3: NOT needed: raw weight / container / multiplier used. NEEDED: to show somehow in case of a product of separate amount (normal, peeled, frozen, etc) - how the sum came out (what parts it exists of).
- 4: would be really nice, but its future task. not for now.
- 5: for now we don't need to actually save them in DB. it will be used during the daily/weekly/monthly closings and at the end the end results will be registered by hand in the czech system. Separately they will be sent to email to a given address. Later phase could contain storing the values and looking back later.

---

## 7. Environment

_(ask both)_

- [x] What device(s) are actually available at the register (you're building
      a web app — confirm there's at least one phone, tablet, or computer
      it'll realistically run on)?
- [x] Is Wi-Fi/internet reliably available at closing time? (You'd assumed
      yes, online-only — worth a real confirmation on-site.)
- [x] Single location today — any concrete plan or timeline for more
      registers or stores, or is that purely hypothetical for now?

**Answers:**

- 1: there's a PC and mobile phone as well. Both with internet.
- 2: yes.
- 3: yes maybe a selector of store could be added that is just added to the excel file name. But nothing more.

---

## Exit checklist

Phase 0 is done when you can check off all of these:

- [x] Every product has a name, a type (weighed/counted), and — if weighed —
      every variant/multiplier it can have.
- [x] Every container has a name and a tare weight, and you know how staff
      pick the right one today.
- [x] You know the exact order of operations for the weight → net-quantity
      calculation (tare then multiply, or multiply then tare).
- [x] You have a real or sample report to match the POC's output against.
- [x] You've confirmed the device and connectivity assumptions the POC was
      built on.
