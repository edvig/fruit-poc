import { describe, expect, it } from "vitest";

import type { Entry } from "@/lib/entries";
import {
  parseSession,
  serialiseSession,
  today,
  type StoredSession,
} from "@/lib/session";

const KNOWN = new Set(["fresh-narancs", "fresh-alma"]);

const entry = (id: string, productId: string): Entry => ({
  id,
  kind: "weight",
  productId,
  raw: 1,
  containerId: "none",
  netGrams: 1000,
});

const session = (entries: Entry[]): StoredSession => ({
  version: 1,
  tier: "daily",
  startedAt: "2026-09-08",
  entries,
});

describe("round trip", () => {
  it("restores a closing exactly as it was saved", () => {
    const saved = session([entry("a", "fresh-narancs")]);
    const result = parseSession(serialiseSession(saved), KNOWN);
    expect(result?.session).toEqual(saved);
    expect(result?.dropped).toBe(0);
  });

  it("returns null when nothing has been saved", () => {
    expect(parseSession(null, KNOWN)).toBeNull();
    expect(parseSession("", KNOWN)).toBeNull();
  });
});

describe("refusing to trust bad data", () => {
  it("survives corrupt JSON rather than white-screening", () => {
    expect(parseSession("{not json", KNOWN)).toBeNull();
  });

  it("ignores a session written by a different version", () => {
    const raw = JSON.stringify({ ...session([]), version: 99 });
    expect(parseSession(raw, KNOWN)).toBeNull();
  });

  it("ignores a payload that is not a session at all", () => {
    expect(parseSession(JSON.stringify([1, 2, 3]), KNOWN)).toBeNull();
  });

  it("drops entries whose product left the config, keeping the rest", () => {
    const raw = serialiseSession(
      session([
        entry("a", "fresh-narancs"),
        entry("b", "product-that-was-deleted"),
      ]),
    );
    const result = parseSession(raw, KNOWN);
    expect(result?.session.entries.map((e: Entry) => e.id)).toEqual(["a"]);
    expect(result?.dropped).toBe(1);
  });
});

describe("closing date", () => {
  it("uses the local calendar day, not UTC", () => {
    // 23:50 in Budapest (UTC+2) is still the 8th locally, but the 21:50 UTC
    // instant would read as the 8th too - so pin a case where they differ.
    const late = new Date(2026, 8, 8, 23, 50, 0);
    expect(today(late)).toBe("2026-09-08");
  });

  it("pads single-digit months and days", () => {
    expect(today(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("a saved entry whose variant or container is gone", () => {
  // The product check is the only one parseSession makes: an entry for a
  // deleted product could never be seen or removed, while one whose *variant*
  // or *container* was renamed still has its own stored netGrams and stays
  // correct on the report. These pin that deliberate difference.
  it("keeps an entry whose variant no longer exists", () => {
    const stale: Entry = {
      id: "a",
      kind: "weight",
      productId: "fresh-narancs",
      raw: 2.34,
      containerId: "metal-small",
      variantId: "candied",
      netGrams: 2786,
    };
    const result = parseSession(serialiseSession(session([stale])), KNOWN);

    expect(result?.dropped).toBe(0);
    expect(result?.session.entries).toEqual([stale]);
  });

  it("keeps an entry whose container no longer exists", () => {
    const stale: Entry = {
      id: "a",
      kind: "weight",
      productId: "fresh-alma",
      raw: 2,
      containerId: "wooden-crate",
      netGrams: 2000,
    };
    const result = parseSession(serialiseSession(session([stale])), KNOWN);

    expect(result?.dropped).toBe(0);
    expect(result?.session.entries[0]).toMatchObject({ netGrams: 2000 });
  });
});

describe("counting what was dropped", () => {
  it("reports how many entries went, not just that some did", () => {
    const result = parseSession(
      serialiseSession(
        session([
          entry("a", "fresh-narancs"),
          entry("b", "fresh-retired"),
          entry("c", "fresh-also-gone"),
        ]),
      ),
      KNOWN,
    );

    expect(result?.dropped).toBe(2);
    expect(result?.session.entries.map((e) => e.id)).toEqual(["a"]);
  });
});
