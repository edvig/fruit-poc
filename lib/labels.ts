import type { AppConfig, Product } from "@/lib/config";
import { entryValue, type Entry } from "@/lib/entries";
import { formatWithUnit } from "@/lib/format";

/**
 * How one entry is described back to staff — "Peeled · 2.786 kg". Shared by
 * the entry chips and the summary breakdown so the two never drift.
 */
export function entryLabel(
  entry: Entry,
  product: Product,
  config: AppConfig,
): string {
  return `${entryForm(entry, product, config)} · ${formatWithUnit(
    entryValue(entry, product.unit),
    product.unit,
  )}`;
}

/** Just the "what kind of measurement was this" half. */
export function entryForm(
  entry: Entry,
  product: Product,
  config: AppConfig,
): string {
  if (entry.kind === "weight") {
    const variant = product.variants?.find((v) => v.id === entry.variantId);
    if (variant) return variant.label;
    const container = config.containers.find((c) => c.id === entry.containerId);
    // "No container" is a real answer here, not noise: it says which container
    // was used just as much as "Small" does.
    return container?.name ?? "Weighed";
  }
  if (entry.kind === "count") {
    const parts = (product.packs ?? [])
      .map((pack) => {
        const count = entry.packCounts[pack.id] ?? 0;
        return count > 0 ? `${count} ${pack.label}` : null;
      })
      .filter((p): p is string => p !== null);
    if (entry.pieces > 0) parts.push(`${entry.pieces} loose`);
    return parts.length > 0 ? parts.join(" + ") : "Counted";
  }
  return "Amount";
}
