import type { AppConfig, ClosingTier } from "@/lib/config";
import type { Entry } from "@/lib/entries";
import { entryLabel } from "@/lib/labels";
import { buildSummary } from "@/lib/summary";

/**
 * What a cell *is*, not what it looks like. The route turns these into the
 * writer's fonts, fills and borders, so the layout can be tested without
 * unzipping a workbook and the styling lives in one place.
 */
export type CellStyle =
  | "title"
  | "metaLabel"
  | "meta"
  | "header"
  | "band"
  | "name"
  | "number"
  | "unit"
  | "note"
  | "missing";

export interface ExportCell {
  value?: string | number | null;
  style?: CellStyle;
  /** Kilos need decimals; counts do not. */
  format?: string;
  /** Merges this cell with the next `columnSpan - 1` cells of the row. */
  columnSpan?: number;
}

export type ExportRow = ExportCell[];

/** The sheet is this wide; every band stretches across all of it. */
export const COLUMN_COUNT = 4;

const TIER_LABELS: Record<ClosingTier, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/**
 * The sheet, as plain data — a title block, then one list: each category as a
 * heading band with its products underneath, the breakdown spelled out where a
 * product was measured in several forms, and whatever was left unentered.
 *
 * It follows the shape of Fruitisimo's own inventory sheet (heading, bordered
 * table, category bands) but keeps everything in one column of products rather
 * than the original's two halves.
 */
export function buildExportRows(
  config: AppConfig,
  tier: ClosingTier,
  startedAt: string,
  entries: readonly Entry[],
): ExportRow[] {
  const summary = buildSummary(config, tier, entries);
  const productCount = summary.enteredCount + summary.missingCount;

  const rows: ExportRow[] = [
    stretched("title", {
      value: `${TIER_LABELS[tier]} closing`,
      style: "title",
      // One wide cell across the sheet. The padding cells below still carry
      // the fill, so the band holds up wherever a viewer ignores the merge.
      columnSpan: COLUMN_COUNT,
    }),
    meta("Date", startedAt),
    meta("Entered", `${summary.enteredCount} of ${productCount} products`),
    [],
    [
      { value: "Product", style: "header" },
      { value: "Quantity", style: "header" },
      { value: "Unit", style: "header" },
      { value: "Measured as", style: "header" },
    ],
  ];

  for (const { group, lines } of summary.groups) {
    rows.push(band(group.label));
    for (const { product, total, entries: forms } of lines) {
      rows.push([
        { value: product.name, style: "name" },
        // A real number, not text, so the sheet can be summed and checked.
        {
          value: round(total, product.unit),
          style: "number",
          format: numberFormat(product.unit),
        },
        { value: product.unit, style: "unit" },
        {
          value:
            forms.length > 1
              ? forms.map((e) => entryLabel(e, product, config)).join(" + ")
              : null,
          style: "note",
        },
      ]);
    }
  }

  if (summary.missing.length > 0) {
    rows.push([]);
    rows.push(band(`Not entered (${summary.missingCount})`));
    for (const product of summary.missing) {
      rows.push([
        { value: product.name, style: "missing" },
        { value: null, style: "number" },
        { value: product.unit, style: "unit" },
        { value: null, style: "note" },
      ]);
    }
  }

  return rows;
}

/**
 * A row that reads as one solid band: the given cells first, then empty cells
 * carrying the same style out to the last column. Nothing is merged — a filled
 * empty cell still lets long text overflow across it, and every viewer paints
 * the band the same way.
 */
function stretched(fill: CellStyle, ...cells: ExportCell[]): ExportRow {
  return [
    ...cells,
    ...Array<ExportCell>(COLUMN_COUNT - cells.length).fill({ style: fill }),
  ];
}

/** One line of the header block: a bold label with its value beside it. */
function meta(label: string, value: string): ExportRow {
  return stretched(
    "meta",
    { value: label, style: "metaLabel" },
    { value, style: "meta" },
  );
}

/**
 * A category heading, running the full width — the way the category rows do on
 * Fruitisimo's sheet.
 */
function band(label: string): ExportRow {
  return stretched("band", { value: label, style: "band" });
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
