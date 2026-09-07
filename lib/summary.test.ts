import { describe, expect, it } from "vitest";

import { getConfig } from "@/lib/config";
import { productTotal, type Entry } from "@/lib/entries";
import { entryForm, entryLabel } from "@/lib/labels";
import { buildSummary } from "@/lib/summary";

const config = getConfig();
const product = (id: string) => {
  const found = config.products.find((p) => p.id === id);
  if (!found) throw new Error(`no product ${id}`);
  return found;
};

const weight = (
  id: string,
  productId: string,
  netGrams: number,
  extra: Partial<Entry> = {},
): Entry => ({
  id,
  kind: "weight",
  productId,
  raw: 1,
  containerId: "none",
  netGrams,
  ...extra,
} as Entry);

describe("the summary", () => {
  it("lists one line per entered product, grouped", () => {
    const entries = [
      weight("a", "fresh-alma", 1107),
      weight("b", "icecream-vanilia", 450),
    ];
    const summary = buildSummary(config, "daily", entries);

    expect(summary.groups.map((g) => g.group.id)).toEqual(["fresh", "icecream"]);
    expect(summary.groups[0]!.lines).toHaveLength(1);
    expect(summary.groups[0]!.lines[0]!.product.name).toBe("Alma");
    expect(summary.enteredCount).toBe(2);
  });

  it("puts every unentered product of the tier in the missing list", () => {
    const summary = buildSummary(config, "daily", [weight("a", "fresh-alma", 1000)]);
    const dailyCount = config.products.filter((p) =>
      p.tiers.includes("daily"),
    ).length;

    expect(summary.missingCount).toBe(dailyCount - 1);
    expect(summary.missing.some((p) => p.id === "fresh-alma")).toBe(false);
    // Weekly-only products are not this closing's problem.
    expect(summary.missing.some((p) => p.id === "acc-pohar-0-3")).toBe(false);
  });

  it("scopes itself to the selected closing type", () => {
    const daily = buildSummary(config, "daily", []);
    const monthly = buildSummary(config, "monthly", []);
    expect(monthly.missingCount).toBeGreaterThan(daily.missingCount);
  });

  it("ignores entries for products outside the tier", () => {
    // A weekly-only product entered, then the tier switched back to daily.
    const summary = buildSummary(config, "daily", [
      { id: "x", kind: "count", productId: "acc-pohar-0-3", packCounts: {}, pieces: 5, total: 5 },
    ]);
    expect(summary.enteredCount).toBe(0);
  });
});

describe("multi-form products (Step 7's done-when)", () => {
  const narancs = product("fresh-narancs");
  const entries = [
    weight("a", narancs.id, 2786, { variantId: "peeled", containerId: "metal-small" }),
    weight("b", narancs.id, 4622, { variantId: "whole", containerId: "metal-medium" }),
  ];

  it("shows a total equal to the sum of its individual entries", () => {
    const summary = buildSummary(config, "daily", entries);
    const line = summary.groups[0]!.lines[0]!;

    expect(line.entries).toHaveLength(2);
    const partsTotal = line.entries.reduce(
      (sum, e) => sum + (e.kind === "weight" ? e.netGrams : 0),
      0,
    );
    expect(partsTotal).toBe(7408);
    expect(line.total).toBeCloseTo(7.408, 6);
    expect(line.total).toBeCloseTo(productTotal(narancs, entries), 9);
  });

  it("describes each form so the total can be checked by eye", () => {
    const labels = entries.map((e) => entryLabel(e, narancs, config));
    expect(labels).toEqual(["Peeled · 2.786 kg", "Whole · 4.622 kg"]);
  });
});

describe("describing an entry", () => {
  it("names the container when the product has no variants", () => {
    const entry = weight("a", "fresh-alma", 1107, { containerId: "plastic-large" });
    expect(entryForm(entry, product("fresh-alma"), config)).toBe("Large");
  });

  it("says how a count was made up", () => {
    const entry: Entry = {
      id: "a",
      kind: "count",
      productId: "acc-pohar-0-3",
      packCounts: { karton: 2, csomag: 1 },
      pieces: 7,
      total: 1657,
    };
    expect(entryForm(entry, product("acc-pohar-0-3"), config)).toBe(
      "2 karton + 1 csomag + 7 loose",
    );
  });
});
