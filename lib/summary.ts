import type { AppConfig, ClosingTier, Product, ProductGroup } from "@/lib/config";
import { entriesFor, productTotal, type Entry } from "@/lib/entries";

export interface SummaryLine {
  product: Product;
  /** The one number that goes on the report, in the product's own unit. */
  total: number;
  /** Kept separately so a multi-form product can show how the total was made. */
  entries: Entry[];
}

export interface SummaryGroup {
  group: ProductGroup;
  lines: SummaryLine[];
}

export interface Summary {
  groups: SummaryGroup[];
  /** Products in this closing that nobody has entered yet. */
  missing: Product[];
  enteredCount: number;
  missingCount: number;
}

/**
 * The recap of a closing: one line per entered product, grouped, plus what is
 * still outstanding. Deliberately a snapshot — missing products don't block
 * anything, they're just listed so nothing is forgotten by accident.
 */
export function buildSummary(
  config: AppConfig,
  tier: ClosingTier,
  entries: readonly Entry[],
): Summary {
  const products = config.products.filter((p) => p.tiers.includes(tier));
  const entered = products.filter((p) => entriesFor(p.id, entries).length > 0);
  const missing = products.filter((p) => entriesFor(p.id, entries).length === 0);

  const groups = config.groups
    .map((group) => ({
      group,
      lines: entered
        .filter((p) => p.group === group.id)
        .map((product) => ({
          product,
          total: productTotal(product, entries),
          entries: entriesFor(product.id, entries),
        })),
    }))
    .filter((g) => g.lines.length > 0);

  return {
    groups,
    missing,
    enteredCount: entered.length,
    missingCount: missing.length,
  };
}
