import writeXlsxFile, { type Cell, type Row } from "write-excel-file/node";

import { getConfig } from "@/lib/config";
import { buildExportRows, exportFilename, type ExportCell } from "@/lib/export";
import { checkSession } from "@/lib/session";

/** Our library-agnostic cell description, in the shape the writer wants. */
function toCell(cell: ExportCell): Cell {
  if (cell.value === null) return null;
  if (typeof cell.value === "number") {
    return {
      value: cell.value,
      type: Number,
      format: cell.format,
      fontWeight: cell.bold ? "bold" : undefined,
    };
  }
  return {
    value: cell.value,
    type: String,
    fontWeight: cell.bold ? "bold" : undefined,
  };
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
  const rows: Row[] = buildExportRows(config, tier, startedAt, entries).map(
    (row) => row.map(toCell),
  );

  const file = await writeXlsxFile(rows, {
    sheet: `${TIER_SHEET_NAMES[tier]} ${startedAt}`,
    columns: [{ width: 32 }, { width: 12 }, { width: 8 }, { width: 48 }],
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
