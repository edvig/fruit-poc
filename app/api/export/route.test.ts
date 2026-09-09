import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/export/route";
import type { Entry } from "@/lib/entries";

const entry: Entry = {
  id: "a",
  kind: "weight",
  productId: "fresh-alma",
  raw: 1.5,
  containerId: "plastic-large",
  netGrams: 1107,
};

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/export", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/export", () => {
  it("returns a real xlsx file, named after the closing", async () => {
    const response = await post({
      version: 1,
      tier: "daily",
      startedAt: "2026-09-08",
      entries: [entry],
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("spreadsheetml");
    expect(response.headers.get("Content-Disposition")).toContain(
      "fruitisimo-daily-2026-09-08.xlsx",
    );

    // xlsx is a zip: every real one starts with the "PK" local file header.
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]);
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });

  it("refuses a body that is not a closing", async () => {
    const response = await post({ hello: "world" });
    expect(response.status).toBe(400);
  });

  it("refuses a body that is not JSON at all", async () => {
    const response = await POST(
      new Request("http://localhost/api/export", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("ignores entries for products that no longer exist", async () => {
    const response = await post({
      version: 1,
      tier: "daily",
      startedAt: "2026-09-08",
      entries: [entry, { ...entry, id: "b", productId: "deleted-product" }],
    });
    expect(response.status).toBe(200);
  });
});
