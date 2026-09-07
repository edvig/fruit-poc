import type { Pack, Unit } from "@/lib/config";

/**
 * The closing math, isolated from any UI.
 *
 * Everything is computed in **grams**, because that is the one unit all the
 * source data agrees on: every container tare in `containers.md` is grams,
 * while products are read off the scale in kg (fruit) or g (ice cream).
 * Converting once at the edges keeps a kg product and a g product on the same
 * code path.
 */

/** Phase 0, confirmed with staff: tare comes off first, multiplier after. */
export function computeNetGrams({
  rawGrams,
  tareGrams,
  multiplier = 1,
}: {
  rawGrams: number;
  tareGrams: number;
  multiplier?: number;
}): number {
  return (rawGrams - tareGrams) * multiplier;
}

export function toGrams(value: number, unit: Unit): number {
  switch (unit) {
    case "kg":
      return value * 1000;
    case "g":
      return value;
    case "db":
      throw new Error("db is a count, not a weight");
    case "l":
      throw new Error("l is a volume, not a weight");
  }
}

export function fromGrams(grams: number, unit: Unit): number {
  switch (unit) {
    case "kg":
      return grams / 1000;
    case "g":
      return grams;
    case "db":
      throw new Error("db is a count, not a weight");
    case "l":
      throw new Error("l is a volume, not a weight");
  }
}

/**
 * Scales read to the gram, and a multiplied result like 2786.4 g is a
 * synthetic whole-fruit equivalent — sub-gram precision there is noise, not
 * accuracy. Rounding here also absorbs floating-point dust from the kg→g
 * conversion (2.675 * 1000 is not exactly 2675).
 */
export function roundToGram(grams: number): number {
  return Math.round(grams);
}

export type WeightProblem = "raw-not-positive" | "raw-below-tare";

/**
 * Weighing a product below its own container's tare means the wrong container
 * was picked — the single most likely mistake at the scale, so it gets named
 * rather than silently producing a negative total.
 */
export function checkWeightEntry({
  raw,
  tareGrams,
  unit,
}: {
  raw: number;
  tareGrams: number;
  unit: Unit;
}): WeightProblem | null {
  if (!(raw > 0)) return "raw-not-positive";
  if (toGrams(raw, unit) < tareGrams) return "raw-below-tare";
  return null;
}

export interface WeightEntryResult {
  /** Canonical value, rounded to the nearest gram. */
  netGrams: number;
  /** The same amount in the product's own unit, for display and the report. */
  net: number;
}

/** One weighing: a raw scale reading in the product's unit → its net amount. */
export function computeWeightEntry({
  raw,
  unit,
  tareGrams,
  multiplier = 1,
}: {
  raw: number;
  unit: Unit;
  tareGrams: number;
  multiplier?: number;
}): WeightEntryResult {
  const netGrams = roundToGram(
    computeNetGrams({ rawGrams: toGrams(raw, unit), tareGrams, multiplier }),
  );
  return { netGrams, net: fromGrams(netGrams, unit) };
}

/**
 * One count: boxes and packs multiplied up to pieces, plus loose pieces.
 * Replaces the "800 times 2, plus 50 times 3..." the calculator does today.
 */
export function computeCountEntry({
  packCounts = {},
  pieces = 0,
  packs = [],
}: {
  packCounts?: Record<string, number>;
  pieces?: number;
  packs?: Pack[];
}): number {
  let total = pieces;
  for (const [packId, count] of Object.entries(packCounts)) {
    if (!count) continue;
    const pack = packs.find((p) => p.id === packId);
    if (!pack) throw new Error(`Unknown pack "${packId}"`);
    total += pack.pieces * count;
  }
  return total;
}

/**
 * A product measured in several forms (some peeled, some not; two containers)
 * is one line on the report. Phase 0: record per form, report the sum.
 */
export function sumNetGrams(entries: readonly { netGrams: number }[]): number {
  return entries.reduce((total, e) => total + e.netGrams, 0);
}
