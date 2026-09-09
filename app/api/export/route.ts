import writeXlsxFile, {
  type Cell,
  type CellObject,
  type Row,
} from "write-excel-file/node";

import { getConfig } from "@/lib/config";
import {
  buildExportRows,
  exportFilename,
  type CellStyle,
  type ExportCell,
  type ExportRow,
} from "@/lib/export";
import { checkSession } from "@/lib/session";

const INK = "#1E293B";
const MUTED = "#64748B";
const FAINT = "#94A3B8";
const RULE = "#94A3B8";
const TITLE_FILL = "#CBD5E1";
const SUMMARY_FILL = "#E2E8F0";
const HEADER_FILL = "#E2E8F0";
const BAND_FILL = "#F1F5F9";

/** Style-only cell descriptions: `CellObject` with the value left off. */
type Style = Omit<CellObject, "value" | "type" | "format">;

/** Every cell of the sheet is boxed in, like the original. */
const BOXED: Style = {
  borderStyle: "thin",
  borderColor: RULE,
  alignVertical: "center",
};

/**
 * How each kind of cell looks. Fruitisimo's own sheet is a bordered table with
 * a bold heading, bold column titles and a band per category — this follows
 * that, only in one list instead of two.
 */
const STYLES: Record<CellStyle, Style> = {
  // The top three rows are the summary block: what closing this is, when, and
  // how much of it was done. They are filled and boxed so they read as one
  // header rather than three loose lines on white.
  title: {
    ...BOXED,
    fontSize: 14,
    fontWeight: "bold",
    textColor: INK,
    backgroundColor: TITLE_FILL,
    height: 26,
  },
  metaLabel: {
    ...BOXED,
    fontWeight: "bold",
    fontSize: 12,
    textColor: INK,
    backgroundColor: SUMMARY_FILL,
    height: 19,
  },
  meta: {
    ...BOXED,
    fontSize: 12,
    textColor: INK,
    backgroundColor: SUMMARY_FILL,
    height: 19,
  },
  header: {
    ...BOXED,
    fontWeight: "bold",
    textColor: INK,
    backgroundColor: HEADER_FILL,
    borderStyle: "medium",
    align: "center",
    height: 20,
  },
  band: {
    ...BOXED,
    fontWeight: "bold",
    textColor: INK,
    backgroundColor: BAND_FILL,
    topBorderStyle: "medium",
    bottomBorderStyle: "medium",
    height: 18,
  },
  name: BOXED,
  number: { ...BOXED, align: "right" },
  unit: { ...BOXED, align: "center", textColor: MUTED },
  note: { ...BOXED, textColor: MUTED, wrap: true },
  missing: { ...BOXED, textColor: FAINT },
};

/**
 * A merged cell swallows the ones after it, and the writer insists those be
 * `null`. The rows are built with every cell styled — so a band survives even
 * where a merge is ignored — and the blanking happens here, at the edge.
 */
function toRow(row: ExportRow): Row {
  const cells: Row = [];
  let swallowed = 0;
  for (const cell of row) {
    if (swallowed > 0) {
      cells.push(null);
      swallowed -= 1;
      continue;
    }
    swallowed = (cell.columnSpan ?? 1) - 1;
    cells.push(toCell(cell));
  }
  return cells;
}

/** Our library-agnostic cell description, in the shape the writer wants. */
function toCell(cell: ExportCell | null): Cell {
  if (!cell) return null;
  const style = {
    ...(cell.style ? STYLES[cell.style] : {}),
    ...(cell.columnSpan ? { columnSpan: cell.columnSpan } : {}),
  };

  // An empty cell still gets its borders and fill, so bands and blanks in the
  // table do not leave holes in the grid.
  if (cell.value === null || cell.value === undefined) return style;
  if (typeof cell.value === "number") {
    return { ...style, value: cell.value, type: Number, format: cell.format };
  }
  return { ...style, value: cell.value, type: String };
}

/**
 * Turns a closing into a single-sheet xlsx.
 *
 * The client posts the closing itself — entries, tier, date — and the totals
 * are recomputed here from the server's own config, so the file can never
 * disagree with the rules the app is built on.
 */
const TIER_SHEET_NAMES = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
} as const;

export async function POST(request: Request) {
  const config = getConfig();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const knownIds = new Set(config.products.map((p) => p.id));
  const checked = checkSession(body, knownIds);
  if (!checked) {
    return Response.json({ error: "Not a valid closing" }, { status: 400 });
  }

  const { tier, startedAt, entries } = checked.session;
  const rows: Row[] = buildExportRows(config, tier, startedAt, entries).map(toRow);

  const file = await writeXlsxFile(rows, {
    sheet: `${TIER_SHEET_NAMES[tier]} ${startedAt}`,
    columns: [{ width: 34 }, { width: 12 }, { width: 8 }, { width: 46 }],
    // The title block and the column titles stay put while scrolling a
    // 132-product monthly closing.
    stickyRowsCount: 5,
    showGridLines: false,
  });
  const buffer = await file.toBuffer();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportFilename(tier, startedAt)}"`,
      "Cache-Control": "no-store",
    },
  });
}
