import { describe, expect, it } from "vitest";

import { getConfig } from "@/lib/config";
import type { Entry } from "@/lib/entries";
import {
  buildExportRows,
  COLUMN_COUNT,
  exportFilename,
  type ExportRow,
} from "@/lib/export";

const config = getConfig();

const entries: Entry[] = [
  {
    id: "a",
    kind: "weight",
    productId: "fresh-narancs",
    raw: 2.34,
    containerId: "metal-small",
    variantId: "peeled",
    netGrams: 2786,
  },
  {
    id: "b",
    kind: "weight",
    productId: "fresh-narancs",
    raw: 5,
    containerId: "metal-medium",
    variantId: "whole",
    netGrams: 4622,
  },
  {
    id: "c",
    kind: "weight",
    productId: "icecream-vanilia",
    raw: 1200,
    containerId: "metal-icecream-tray",
    netGrams: 450,
  },
];

const rows = buildExportRows(config, "daily", "2026-09-08", entries);
const text = (row: ExportRow | undefined) => (row ?? []).map((c) => c?.value);
const styles = (row: ExportRow | undefined) => (row ?? []).map((c) => c?.style);
const rowWith = (name: string) => rows.find((r) => r[0]?.value === name);

describe("the summary block at the top", () => {
  // Three filled rows that read as one header: which closing, when, how much
  // of it is done. Nothing is merged, so each row has to carry its style all
  // the way to the last column or the band breaks off mid-sheet.
  it("opens with the closing type, merged and banded across the sheet", () => {
    expect(rows[0]?.[0]).toMatchObject({
      value: "Daily closing",
      style: "title",
      columnSpan: COLUMN_COUNT,
    });
    expect(styles(rows[0])).toEqual(Array(COLUMN_COUNT).fill("title"));
    expect(text(rows[0])?.slice(1)).toEqual([undefined, undefined, undefined]);
  });

  it("labels the date and the progress rather than running them together", () => {
    expect(text(rows[1])?.slice(0, 2)).toEqual(["Date", "2026-09-08"]);
    expect(text(rows[2])?.slice(0, 2)).toEqual(["Entered", "2 of 38 products"]);
  });

  it("carries the header fill past the labels to the sheet edge", () => {
    expect(styles(rows[1])).toEqual(["metaLabel", "meta", "meta", "meta"]);
    expect(styles(rows[2])).toEqual(["metaLabel", "meta", "meta", "meta"]);
  });
});

describe("the table", () => {
  it("has a bold header row over every column", () => {
    expect(text(rows[4])).toEqual([
      "Product",
      "Quantity",
      "Unit",
      "Measured as",
    ]);
    expect(styles(rows[4])).toEqual(Array(COLUMN_COUNT).fill("header"));
  });

  it("writes quantities as numbers, so the sheet can be summed", () => {
    const narancs = rowWith("Narancs");
    expect(narancs?.[1]?.value).toBe(7.408);
    expect(typeof narancs?.[1]?.value).toBe("number");
    expect(narancs?.[1]?.format).toBe("0.000");
    expect(narancs?.[2]?.value).toBe("kg");
  });

  it("styles a product line column by column", () => {
    expect(styles(rowWith("Narancs"))).toEqual([
      "name",
      "number",
      "unit",
      "note",
    ]);
  });

  it("spells out the breakdown only for multi-form products", () => {
    expect(rowWith("Narancs")?.[3]?.value).toBe(
      "Peeled · 2.786 kg + Whole · 4.622 kg",
    );

    const vanilia = rowWith("Vanília");
    expect(vanilia?.[1]?.value).toBe(450);
    expect(vanilia?.[3]?.value).toBeNull();
  });
});

describe("category bands", () => {
  it("puts each group above its products", () => {
    const headingIndex = rows.findIndex(
      (r) => r[0]?.value === "Fresh fruit & vegetables",
    );
    const narancsIndex = rows.findIndex((r) => r[0]?.value === "Narancs");
    expect(headingIndex).toBeGreaterThan(-1);
    expect(narancsIndex).toBe(headingIndex + 1);
  });

  // The label sits in the first cell, but the fill and borders have to run the
  // full width or the band breaks off mid-sheet.
  it("runs the band across every column", () => {
    const band = rowWith("Fresh fruit & vegetables");
    expect(styles(band)).toEqual(Array(COLUMN_COUNT).fill("band"));
    expect(text(band)?.slice(1)).toEqual([undefined, undefined, undefined]);
  });

  it("keeps one list rather than splitting the sheet in halves", () => {
    // Every row is at most as wide as the header: no second table beside it.
    for (const row of rows) expect(row.length).toBeLessThanOrEqual(COLUMN_COUNT);
  });
});

describe("what was never entered", () => {
  it("gets its own band and greyed-out lines", () => {
    const heading = rows.find((r) =>
      String(r[0]?.value ?? "").startsWith("Not entered ("),
    );
    expect(heading?.[0]?.value).toBe("Not entered (36)");
    expect(heading?.[0]?.style).toBe("band");

    const alma = rowWith("Alma");
    expect(alma?.[0]?.style).toBe("missing");
    expect(alma?.[1]?.value).toBeNull();
    expect(alma?.[2]?.value).toBe("kg");
  });

  it("still boxes the blank cells in, so the grid has no holes", () => {
    expect(styles(rowWith("Alma"))).toEqual([
      "missing",
      "number",
      "unit",
      "note",
    ]);
  });
});

describe("the file itself", () => {
  it("is named after the closing it holds", () => {
    expect(exportFilename("weekly", "2026-09-08")).toBe(
      "fruitisimo-weekly-2026-09-08.xlsx",
    );
  });
});
