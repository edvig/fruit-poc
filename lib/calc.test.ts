import { describe, expect, it } from "vitest";

import {
  checkWeightEntry,
  computeCountEntry,
  computeNetGrams,
  computeWeightEntry,
  fromGrams,
  roundToGram,
  sumNetGrams,
  toGrams,
} from "@/lib/calc";
import { getConfig } from "@/lib/config";

const config = getConfig();
const product = (id: string) => {
  const found = config.products.find((p) => p.id === id);
  if (!found) throw new Error(`no product ${id}`);
  return found;
};
const tare = (id: string) => {
  const found = config.containers.find((c) => c.id === id);
  if (!found) throw new Error(`no container ${id}`);
  return found.tare;
};
const multiplier = (productId: string, variantId: string) => {
  const found = product(productId).variants?.find((v) => v.id === variantId);
  if (!found) throw new Error(`no variant ${productId}/${variantId}`);
  return found.multiplier;
};

describe("order of operations", () => {
  it("deducts tare first, then multiplies (Phase 0, confirmed with staff)", () => {
    // (2340 - 276) * 1.35 = 2786.4 — NOT 2340 * 1.35 - 276 = 2883
    expect(
      computeNetGrams({ rawGrams: 2340, tareGrams: 276, multiplier: 1.35 }),
    ).toBeCloseTo(2786.4, 6);
  });

  it("defaults to a multiplier of 1", () => {
    expect(computeNetGrams({ rawGrams: 1500, tareGrams: 393 })).toBe(1107);
  });
});

describe("units", () => {
  it("converts kg and g to grams", () => {
    expect(toGrams(2.34, "kg")).toBe(2340);
    expect(toGrams(1200, "g")).toBe(1200);
    expect(fromGrams(2786, "kg")).toBe(2.786);
    expect(fromGrams(450, "g")).toBe(450);
  });

  it("refuses to treat a counted product as a weight", () => {
    expect(() => toGrams(5, "db")).toThrow(/count/);
  });

  it("absorbs floating-point dust from the kg conversion", () => {
    // 2.675 * 1000 is 2674.9999999999995 in binary floating point.
    expect(roundToGram(toGrams(2.675, "kg"))).toBe(2675);
  });
});

describe("hand-checked weighings against the real config", () => {
  // Each case is written as the arithmetic a staff member does today.
  const cases = [
    {
      name: "peeled orange in a small metal tray",
      raw: 2.34,
      productId: "fresh-narancs",
      containerId: "metal-small",
      variantId: "peeled",
      // (2340 - 276) = 2064 * 1.35 = 2786.4 -> 2786 g
      expectedGrams: 2786,
      expectedNet: 2.786,
    },
    {
      name: "whole orange in a medium metal tray",
      raw: 5,
      productId: "fresh-narancs",
      containerId: "metal-medium",
      variantId: "whole",
      // (5000 - 378) = 4622 * 1 = 4622 g
      expectedGrams: 4622,
      expectedNet: 4.622,
    },
    {
      name: "apple in a large plastic tray (no variants at all)",
      raw: 1.5,
      productId: "fresh-alma",
      containerId: "plastic-large",
      variantId: null,
      // (1500 - 393) = 1107 g
      expectedGrams: 1107,
      expectedNet: 1.107,
    },
    {
      name: "peeled watermelon in a deco basket (the 1.4 multiplier)",
      raw: 3,
      productId: "fresh-gorogdinnye",
      containerId: "deco-basket",
      variantId: "peeled",
      // (3000 - 600) = 2400 * 1.4 = 3360 g
      expectedGrams: 3360,
      expectedNet: 3.36,
    },
    {
      name: "vanilla ice cream in the ice cream tray (grams, not kg)",
      raw: 1200,
      productId: "icecream-vanilia",
      containerId: "metal-icecream-tray",
      variantId: null,
      // 1200 - 750 = 450 g
      expectedGrams: 450,
      expectedNet: 450,
    },
    {
      name: "banana weighed straight on the scale",
      raw: 0.8,
      productId: "fresh-banan",
      containerId: "none",
      variantId: null,
      expectedGrams: 800,
      expectedNet: 0.8,
    },
    {
      name: "peeled lime in the mini metal tray (rounds 1474.2 to 1474)",
      raw: 1.111,
      productId: "fresh-lime",
      containerId: "metal-mini",
      variantId: "peeled",
      // (1111 - 19) = 1092 * 1.35 = 1474.2 -> 1474 g
      expectedGrams: 1474,
      expectedNet: 1.474,
    },
  ] as const;

  for (const c of cases) {
    it(c.name, () => {
      const result = computeWeightEntry({
        raw: c.raw,
        unit: product(c.productId).unit,
        tareGrams: tare(c.containerId),
        multiplier: c.variantId
          ? multiplier(c.productId, c.variantId)
          : undefined,
      });
      expect(result.netGrams).toBe(c.expectedGrams);
      expect(result.net).toBeCloseTo(c.expectedNet, 6);
    });
  }
});

describe("catching mistakes at the scale", () => {
  it("names a raw weight below the container's tare (wrong container picked)", () => {
    expect(
      checkWeightEntry({ raw: 0.2, unit: "kg", tareGrams: tare("metal-small") }),
    ).toBe("raw-below-tare");
  });

  it("rejects zero and negative readings", () => {
    expect(checkWeightEntry({ raw: 0, unit: "kg", tareGrams: 0 })).toBe(
      "raw-not-positive",
    );
    expect(checkWeightEntry({ raw: -1, unit: "kg", tareGrams: 0 })).toBe(
      "raw-not-positive",
    );
  });

  it("passes a normal weighing", () => {
    expect(
      checkWeightEntry({ raw: 2.34, unit: "kg", tareGrams: tare("metal-small") }),
    ).toBeNull();
  });
});

describe("counted items", () => {
  const cups = product("acc-pohar-0-3");
  const straws = product("acc-szivoszal");

  it("multiplies boxes and packs up to pieces", () => {
    // 2 karton (800) + 3 csomag (50) + 7 loose = 1600 + 150 + 7
    expect(
      computeCountEntry({
        packCounts: { karton: 2, csomag: 3 },
        pieces: 7,
        packs: cups.packs,
      }),
    ).toBe(1757);
  });

  it("handles the larger straw pack sizes", () => {
    // 1 karton (5000) + 2 csomag (500) = 6000
    expect(
      computeCountEntry({
        packCounts: { karton: 1, csomag: 2 },
        packs: straws.packs,
      }),
    ).toBe(6000);
  });

  it("counts loose pieces on their own", () => {
    expect(computeCountEntry({ pieces: 12, packs: cups.packs })).toBe(12);
  });

  it("is zero when nothing is entered", () => {
    expect(computeCountEntry({ packs: cups.packs })).toBe(0);
  });

  it("throws on a pack the product does not have", () => {
    expect(() =>
      computeCountEntry({ packCounts: { doboz: 1 }, packs: cups.packs }),
    ).toThrow(/Unknown pack/);
  });
});

describe("multi-form products", () => {
  it("sums the forms into one total (peeled + whole oranges)", () => {
    const peeled = computeWeightEntry({
      raw: 2.34,
      unit: "kg",
      tareGrams: tare("metal-small"),
      multiplier: multiplier("fresh-narancs", "peeled"),
    });
    const whole = computeWeightEntry({
      raw: 5,
      unit: "kg",
      tareGrams: tare("metal-medium"),
    });
    const total = sumNetGrams([peeled, whole]);
    expect(total).toBe(2786 + 4622);
    expect(fromGrams(total, "kg")).toBe(7.408);
  });
});

describe("the real config's multipliers", () => {
  it("applies to exactly the five peeled citrus/melon products", () => {
    const withVariants = config.products
      .filter((p) => p.variants)
      .map((p) => p.id);
    expect(withVariants).toEqual([
      "fresh-narancs",
      "fresh-grapefruit",
      "fresh-gorogdinnye",
      "fresh-citrom",
      "fresh-lime",
    ]);
  });

  it("scales peeled weight up, never down", () => {
    for (const p of config.products) {
      for (const v of p.variants ?? []) {
        expect(v.multiplier).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
