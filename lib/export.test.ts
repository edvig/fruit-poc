import { describe, expect, it } from "vitest";

import { getConfig } from "@/lib/config";
import type { Entry } from "@/lib/entries";
import { buildExportRows, exportFilename } from "@/lib/export";

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
const text = (row: (typeof rows)[number] | undefined) =>
  (row ?? []).map((c) => c.value);

describe("the exported sheet", () => {
  it("opens with the closing type and date", () => {
    expect(text(rows[0])).toEqual(["Daily closing", "2026-09-08"]);
  });

  it("has a header row", () => {
    expect(text(rows[2])).toEqual([
      "Product",
      "Quantity",
      "Unit",
      "Measured as",
    ]);
  });

  it("writes quantities as numbers, so the sheet can be summed", () => {
    const narancs = rows.find((r) => r[0]?.value === "Narancs");
    expect(narancs?.[1]?.value).toBe(7.408);
    expect(typeof narancs?.[1]?.value).toBe("number");
    expect(narancs?.[2]?.value).toBe("kg");
  });

  it("spells out the breakdown only for multi-form products", () => {
    const narancs = rows.find((r) => r[0]?.value === "Narancs");
    expect(narancs?.[3]?.value).toBe("Peeled · 2.786 kg + Whole · 4.622 kg");

    const vanilia = rows.find((r) => r[0]?.value === "Vanília");
    expect(vanilia?.[1]?.value).toBe(450);
    expect(vanilia?.[3]?.value).toBeNull();
  });

  it("groups products under their category heading", () => {
    const headingIndex = rows.findIndex(
      (r) => r[0]?.value === "Fresh fruit & vegetables",
    );
    const narancsIndex = rows.findIndex((r) => r[0]?.value === "Narancs");
    expect(headingIndex).toBeGreaterThan(-1);
    expect(narancsIndex).toBe(headingIndex + 1);
  });

  it("lists what was never entered, so nothing is silently missing", () => {
    const heading = rows.find((r) =>
      String(r[0]?.value ?? "").startsWith("Not entered ("),
    );
    expect(heading?.[0]?.value).toBe("Not entered (36)");
    expect(rows.some((r) => r[0]?.value === "Alma")).toBe(true);
  });

  it("names the file after the closing it holds", () => {
    expect(exportFilename("weekly", "2026-09-08")).toBe(
      "fruitisimo-weekly-2026-09-08.xlsx",
    );
  });
});
