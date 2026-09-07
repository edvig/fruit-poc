import { fromGrams } from "@/lib/calc";
import type { Product, Unit } from "@/lib/config";

/**
 * One measurement committed during a closing. A product can have several —
 * some peeled, some not, or two containers' worth — which is why the report
 * keeps them separate but sums them into one line.
 */
export interface WeightEntry {
  id: string;
  kind: "weight";
  productId: string;
  /** As typed, in the product's own unit, so an entry can be shown back. */
  raw: number;
  containerId: string;
  variantId?: string;
  /** Computed at commit time: (raw - tare) * multiplier, in grams. */
  netGrams: number;
}

export interface CountEntry {
  id: string;
  kind: "count";
  productId: string;
  packCounts: Record<string, number>;
  pieces: number;
  /** Boxes and packs already multiplied up to pieces. */
  total: number;
}

export interface AmountEntry {
  id: string;
  kind: "amount";
  productId: string;
  /** Litres and the like: read straight off the container, no tare. */
  amount: number;
}

export type Entry = WeightEntry | CountEntry | AmountEntry;

export function newEntryId(): string {
  return crypto.randomUUID();
}

/** The value one entry contributes, in the product's own unit. */
export function entryValue(entry: Entry, unit: Unit): number {
  switch (entry.kind) {
    case "weight":
      return fromGrams(entry.netGrams, unit);
    case "count":
      return entry.total;
    case "amount":
      return entry.amount;
  }
}

/**
 * The one number that goes on the report for a product — the sum of however
 * many forms it was measured in. Weights are summed in grams first, so
 * rounding happens once rather than once per entry.
 */
export function productTotal(product: Product, entries: readonly Entry[]): number {
  const mine = entries.filter((e) => e.productId === product.id);
  if (mine.length === 0) return 0;

  if (product.kind === "weight") {
    const grams = mine.reduce(
      (sum, e) => sum + (e.kind === "weight" ? e.netGrams : 0),
      0,
    );
    return fromGrams(grams, product.unit);
  }
  return mine.reduce((sum, e) => sum + entryValue(e, product.unit), 0);
}

export function entriesFor(
  productId: string,
  entries: readonly Entry[],
): Entry[] {
  return entries.filter((e) => e.productId === productId);
}
