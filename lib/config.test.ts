import { describe, expect, it } from "vitest";

import { fromGrams, toGrams } from "@/lib/calc";
import { defaultContainerFor, getConfig, productsForTier } from "@/lib/config";

const config = getConfig();
const product = (id: string) => {
  const found = config.products.find((p) => p.id === id);
  if (!found) throw new Error(`no product ${id}`);
  return found;
};

describe("default containers", () => {
  it("preselects the ice cream tray for the whole ice cream group", () => {
    for (const p of config.products.filter((p) => p.group === "icecream")) {
      const preset = defaultContainerFor(p);
      expect(preset?.id).toBe("metal-icecream-tray");
      expect(preset?.tare).toBe(750);
    }
  });

  it("leaves fresh and frozen fruit without one", () => {
    expect(defaultContainerFor(product("fresh-alma"))).toBeUndefined();
    expect(defaultContainerFor(product("frozen-afonya"))).toBeUndefined();
  });

  it("never gives a counted product a container", () => {
    for (const p of config.products.filter((p) => p.kind === "count")) {
      expect(defaultContainerFor(p)).toBeUndefined();
    }
  });

  it("only ever resolves to a container from the real list", () => {
    const ids = new Set(config.containers.map((c) => c.id));
    for (const p of config.products) {
      const preset = defaultContainerFor(p);
      if (preset) expect(ids.has(preset.id)).toBe(true);
    }
  });
});

describe("closing tiers", () => {
  const tierIds = (tier: "daily" | "weekly" | "monthly") =>
    new Set(productsForTier(tier).map((p) => p.id));

  // Phase 0: daily is a subset of weekly, and monthly is the full sheet.
  it("nests daily inside weekly inside monthly", () => {
    const daily = tierIds("daily");
    const weekly = tierIds("weekly");
    const monthly = tierIds("monthly");

    expect(daily.size).toBeGreaterThan(0);
    for (const id of daily) expect(weekly.has(id)).toBe(true);
    for (const id of weekly) expect(monthly.has(id)).toBe(true);
    expect(monthly.size).toBeGreaterThan(weekly.size);
  });

  it("has every monthly-only group in the monthly closing only", () => {
    for (const group of ["vitrin", "szeletek", "egyeb", "kave"]) {
      const inGroup = config.products.filter((p) => p.group === group);
      expect(inGroup.length).toBeGreaterThan(0);
      for (const p of inGroup) expect(p.tiers).toEqual(["monthly"]);
    }
  });
});

describe("amount products", () => {
  // The monthly sheet's litres: no scale reading, no piece count, just the
  // number staff read off the stock.
  it("are the litre items, and carry no weighing or counting extras", () => {
    const amounts = config.products.filter((p) => p.kind === "amount");
    expect(amounts.map((p) => p.name)).toEqual([
      "Kókusz tej (sűrű)",
      "Kókusz ital (Valsoia / Metro)",
      "Tej",
      "Laktózmentes tej",
      "Agave szirup 250ml",
    ]);
    for (const p of amounts) {
      expect(p.unit).toBe("l");
      expect(p.variants).toBeUndefined();
      expect(p.packs).toBeUndefined();
      expect(defaultContainerFor(p)).toBeUndefined();
    }
  });

  it("keeps litres away from the gram-based engine", () => {
    expect(() => toGrams(1, "l")).toThrow(/volume/);
    expect(() => fromGrams(1000, "l")).toThrow(/volume/);
  });
});
