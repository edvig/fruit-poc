import type { ClosingTier } from "@/lib/config";
import type { Entry } from "@/lib/entries";

export const STORAGE_KEY = "fruitisimo.closing.v1";

export interface StoredSession {
  version: 1;
  tier: ClosingTier;
  /** Calendar day the closing was started on, as YYYY-MM-DD, local time. */
  startedAt: string;
  entries: Entry[];
}

export interface LoadResult {
  session: StoredSession;
  /** Entries dropped because their product is no longer in the config. */
  dropped: number;
}

export function today(now: Date = new Date()): string {
  // Local date, not UTC: a closing at 23:50 in Budapest belongs to that day,
  // not to tomorrow.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Parses a stored closing. Anything unreadable — corrupt JSON, an older
 * shape — returns null rather than throwing, because losing an unsaved
 * closing is bad but a white screen at the register is worse.
 */
export function parseSession(
  raw: string | null,
  knownProductIds: ReadonlySet<string>,
): LoadResult | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return checkSession(parsed, knownProductIds);
}

/** The same validation, for a value that has already been parsed. */
export function checkSession(
  parsed: unknown,
  knownProductIds: ReadonlySet<string>,
): LoadResult | null {
  if (!isStoredSession(parsed)) return null;

  // The config can change under a saved closing between deploys; an entry
  // pointing at a product that no longer exists would never be visible or
  // removable, so it is dropped and reported.
  const entries = parsed.entries.filter((e) => knownProductIds.has(e.productId));
  return {
    session: { ...parsed, entries },
    dropped: parsed.entries.length - entries.length,
  };
}

export function serialiseSession(session: StoredSession): string {
  return JSON.stringify(session);
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<StoredSession>;
  return (
    v.version === 1 &&
    typeof v.startedAt === "string" &&
    typeof v.tier === "string" &&
    Array.isArray(v.entries) &&
    v.entries.every(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as Entry).id === "string" &&
        typeof (e as Entry).productId === "string",
    )
  );
}
