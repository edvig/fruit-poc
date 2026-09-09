import type { AppConfig, ClosingTier } from "@/lib/config";
import type { Entry } from "@/lib/entries";
import { entryLabel } from "@/lib/labels";
import { buildSummary } from "@/lib/summary";

export interface ExportCell {
  value: string | number | null;
  /** Group headings and the header row are set in bold. */
  bold?: boolean;
  /** Kilos need decimals; counts do not. */
  format?: string;
}

export type ExportRow = ExportCell[];

const TIER_LABELS: Record<ClosingTier, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/**
 * The sheet, as plain data — one row per entered product, grouped, with the
 * breakdown spelled out where a product was measured in several forms, then
 * whatever was left unentered.
 *
 * Kept separate from the file-writing so the contents can be checked without
 * unzipping a workbook.
 */
export function buildExportRows(
  config: AppConfig,
  tier: ClosingTier,
  startedAt: string,
  entries: readonly Entry[],
): ExportRow[] {
  const summary = buildSummary(config, tier, entries);
  const rows: ExportRow[] = [
    [{ value: `${TIER_LABELS[tier]} closing`, bold: true }, { value: startedAt }],
    [],
    [
      { value: "Product", bold: true },
      { value: "Quantity", bold: true },
      { value: "Unit", bold: true },
      { value: "Measured as", bold: true },
    ],
  ];

  for (const { group, lines } of summary.groups) {
    rows.push([{ value: group.label, bold: true }]);
    for (const { product, total, entries: forms } of lines) {
      rows.push([
        { value: product.name },
        // A real number, not text, so the sheet can be summed and checked.
        { value: round(total, product.unit), format: numberFormat(product.unit) },
        { value: product.unit },
        {
          value:
            forms.length > 1
              ? forms.map((e) => entryLabel(e, product, config)).join(" + ")
              : null,
        },
      ]);
    }
  }

  if (summary.missing.length > 0) {
    rows.push([]);
    rows.push([{ value: `Not entered (${summary.missingCount})`, bold: true }]);
    for (const product of summary.missing) {
      rows.push([{ value: product.name }, { value: null }, { value: product.unit }]);
    }
  }

  return rows;
}

export function exportFilename(tier: ClosingTier, startedAt: string): string {
  return `fruitisimo-${tier}-${startedAt}.xlsx`;
}

function round(value: number, unit: string): number {
  if (unit === "kg") return Math.round(value * 1000) / 1000;
  if (unit === "l") return Math.round(value * 100) / 100;
  return Math.round(value);
}

function numberFormat(unit: string): string {
  if (unit === "kg") return "0.000";
  if (unit === "l") return "0.00";
  return "0";
}
