import { describe, expect, it } from "vitest";

import { computeWeightEntry } from "@/lib/calc";
import { getConfig } from "@/lib/config";
import { formatQuantity, formatWithUnit } from "@/lib/format";
import {
  entriesFor,
  entryValue,
  productTotal,
  type Entry,
} from "@/lib/entries";

const config = getConfig();
const product = (id: string) => {
  const found = config.products.find((p) => p.id === id);
  if (!found) throw new Error(`no product ${id}`);
  return found;
};

describe("product totals", () => {
  it("sums a multi-form product into one line (peeled + whole oranges)", () => {
    const narancs = product("fresh-narancs");
    const peeled = computeWeightEntry({
      raw: 2.34,
      unit: "kg",
      tareGrams: 276,
      multiplier: 1.35,
    });
    const whole = computeWeightEntry({ raw: 5, unit: "kg", tareGrams: 378 });
    const entries: Entry[] = [
      {
        id: "1",
        kind: "weight",
        productId: narancs.id,
        raw: 2.34,
        containerId: "metal-small",
        variantId: "peeled",
        netGrams: peeled.netGrams,
      },
      {
        id: "2",
        kind: "weight",
        productId: narancs.id,
        raw: 5,
        containerId: "metal-medium",
        variantId: "whole",
        netGrams: whole.netGrams,
      },
    ];
    // 2786 + 4622 = 7408 g
    expect(productTotal(narancs, entries)).toBeCloseTo(7.408, 6);
  });

  it("ignores entries belonging to other products", () => {
    const alma = product("fresh-alma");
    const entries: Entry[] = [
      {
        id: "1",
        kind: "weight",
        productId: "fresh-narancs",
        raw: 1,
        containerId: "none",
        netGrams: 1000,
      },
    ];
    expect(productTotal(alma, entries)).toBe(0);
  });

  it("sums counted entries as pieces", () => {
    const cups = product("acc-pohar-0-3");
    const entries: Entry[] = [
      {
        id: "1",
        kind: "count",
        productId: cups.id,
        packCounts: { karton: 2 },
        pieces: 0,
        total: 1600,
      },
      {
        id: "2",
        kind: "count",
        productId: cups.id,
        packCounts: {},
        pieces: 7,
        total: 7,
      },
    ];
    expect(productTotal(cups, entries)).toBe(1607);
  });

  it("rounds a weight total once, not once per entry", () => {
    const alma = product("fresh-alma");
    // Two entries of 0.5 g each: summing grams first keeps the total honest.
    const entries: Entry[] = [
      { id: "1", kind: "weight", productId: alma.id, raw: 1, containerId: "none", netGrams: 1001 },
      { id: "2", kind: "weight", productId: alma.id, raw: 1, containerId: "none", netGrams: 1001 },
    ];
    expect(productTotal(alma, entries)).toBeCloseTo(2.002, 6);
  });
});

describe("entry values", () => {
  it("converts a weight entry back into the product's unit", () => {
    const entry: Entry = {
      id: "1",
      kind: "weight",
      productId: "icecream-vanilia",
      raw: 1200,
      containerId: "metal-icecream-tray",
      netGrams: 450,
    };
    expect(entryValue(entry, "g")).toBe(450);
    expect(entryValue(entry, "kg")).toBe(0.45);
  });
});

describe("formatting", () => {
  it("writes kilos to the gram and drops trailing zeros", () => {
    expect(formatQuantity(2.786, "kg")).toBe("2.786");
    expect(formatQuantity(3.36, "kg")).toBe("3.36");
    expect(formatQuantity(0.8, "kg")).toBe("0.8");
    expect(formatQuantity(5, "kg")).toBe("5");
  });

  it("writes grams and counts as whole numbers", () => {
    expect(formatQuantity(450.4, "g")).toBe("450");
    expect(formatQuantity(1757, "db")).toBe("1757");
  });

  it("appends the unit", () => {
    expect(formatWithUnit(2.786, "kg")).toBe("2.786 kg");
    expect(formatWithUnit(1757, "db")).toBe("1757 db");
  });
});

describe("litre products", () => {
  const tej = product("egyeb-tej");
  const entries: Entry[] = [
    { id: "1", kind: "amount", productId: tej.id, amount: 6 },
    { id: "2", kind: "amount", productId: tej.id, amount: 1.5 },
    { id: "3", kind: "amount", productId: "egyeb-joghurt", amount: 2 },
  ];

  it("takes the typed amount as it stands, with no conversion", () => {
    const carton: Entry = {
      id: "1",
      kind: "amount",
      productId: tej.id,
      amount: 6,
    };
    expect(entryValue(carton, "l")).toBe(6);
  });

  it("sums the litres of one product only", () => {
    expect(productTotal(tej, entries)).toBe(7.5);
  });

  it("is zero for a product nobody entered", () => {
    expect(productTotal(product("egyeb-agave-szirup"), entries)).toBe(0);
  });
});

describe("entriesFor", () => {
  const entries: Entry[] = [
    { id: "1", kind: "amount", productId: "egyeb-tej", amount: 6 },
    {
      id: "2",
      kind: "count",
      productId: "acc-pohar-0-3",
      packCounts: { karton: 1 },
      pieces: 50,
      total: 850,
    },
    { id: "3", kind: "amount", productId: "egyeb-tej", amount: 1.5 },
  ];

  it("picks out one product's entries, in the order they were added", () => {
    expect(entriesFor("egyeb-tej", entries).map((e) => e.id)).toEqual([
      "1",
      "3",
    ]);
  });

  it("is empty for a product with nothing entered", () => {
    expect(entriesFor("fresh-alma", entries)).toEqual([]);
  });
});

describe("formatting litres", () => {
  // Litres are read off a carton, not a scale: two decimals is as fine as the
  // number ever gets, and trailing zeros still go.
  it("writes up to two decimals and drops trailing zeros", () => {
    expect(formatQuantity(1.5, "l")).toBe("1.5");
    expect(formatQuantity(0.25, "l")).toBe("0.25");
    expect(formatQuantity(6, "l")).toBe("6");
    expect(formatQuantity(7.125, "l")).toBe("7.13");
  });

  it("appends the unit", () => {
    expect(formatWithUnit(1.5, "l")).toBe("1.5 l");
  });
});
