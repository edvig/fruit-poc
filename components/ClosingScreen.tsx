"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import ProductRow from "@/components/ProductRow";
import type { AppConfig, ClosingTier } from "@/lib/config";
import type { Entry } from "@/lib/entries";
import {
  parseSession,
  serialiseSession,
  today,
  type StoredSession,
} from "@/lib/session";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  write,
} from "@/lib/session-store";

const TIERS: { id: ClosingTier; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

// Decoration only, so it lives with the UI rather than in the config staff
// edit. Unknown groups fall back to a neutral icon.
const GROUP_EMOJI: Record<string, string> = {
  fresh: "🍎",
  frozen: "🧊",
  icecream: "🍦",
  accessories: "📦",
  vitrin: "🍰",
  szeletek: "🍫",
  egyeb: "🧂",
  kave: "☕",
};

/** Stable reference, so an empty closing doesn't invalidate memos each render. */
const NO_ENTRIES: Entry[] = [];

function dateLabel(isoDay: string): string {
  const [year, month, day] = isoDay.split("-").map(Number);
  return new Date(year!, month! - 1, day!).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ClosingScreen({ config }: { config: AppConfig }) {
  const [fallbackTier, setFallbackTier] = useState<ClosingTier>("daily");
  const [filter, setFilter] = useState<"all" | "missing">("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // The saved closing IS the state: read straight from localStorage during
  // render, so a refresh mid-closing restores itself with no copying step.
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const knownIds = useMemo(
    () => new Set(config.products.map((p) => p.id)),
    [config.products],
  );
  const restored = useMemo(
    () => parseSession(raw, knownIds),
    [raw, knownIds],
  );

  const entries = restored?.session.entries ?? NO_ENTRIES;
  const startedAt = restored?.session.startedAt ?? today();
  const dropped = restored?.dropped ?? 0;
  const tier = restored?.session.tier ?? fallbackTier;

  function save(next: Partial<StoredSession>) {
    write(
      serialiseSession({
        version: 1,
        tier,
        startedAt,
        entries,
        ...next,
      }),
    );
  }

  function setTier(next: ClosingTier) {
    setFallbackTier(next);
    if (restored) save({ tier: next });
  }

  function addEntry(entry: Entry) {
    save({ entries: [...entries, entry] });
  }

  function removeEntry(entryId: string) {
    save({ entries: entries.filter((e) => e.id !== entryId) });
  }

  function startNewClosing() {
    write(null);
    setExpandedId(null);
    setConfirmingReset(false);
  }

  const isStale = entries.length > 0 && startedAt !== today();

  // How many entries each product has, for the progress bar and the Missing
  // filter.
  const entryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      counts[entry.productId] = (counts[entry.productId] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const products = useMemo(
    () => config.products.filter((p) => p.tiers.includes(tier)),
    [config.products, tier],
  );

  const enteredCount = products.filter((p) => entryCounts[p.id]).length;
  const missingCount = products.length - enteredCount;
  const visible =
    filter === "missing" ? products.filter((p) => !entryCounts[p.id]) : products;

  const groups = config.groups
    .map((group) => ({
      ...group,
      products: visible.filter((p) => p.group === group.id),
      total: products.filter((p) => p.group === group.id).length,
    }))
    .filter((g) => g.total > 0);

  const progress =
    products.length === 0 ? 0 : (enteredCount / products.length) * 100;

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-white text-slate-900">
      <header className="flex flex-none flex-col gap-2.5 border-b border-slate-200 px-4 pt-3.5 pb-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[17px] font-semibold tracking-tight">
            Fruitisimo Closing
          </h1>
          <span className="text-xs text-slate-400">{dateLabel(startedAt)}</span>
        </div>

        <div role="tablist" className="flex gap-1 rounded-[10px] bg-slate-100 p-[3px]">
          {TIERS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tier === t.id}
              onClick={() => setTier(t.id)}
              className={`min-h-11 flex-1 rounded-lg py-2 text-[13.5px] font-medium transition ${
                tier === t.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-700 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs tabular-nums whitespace-nowrap text-slate-500">
            {enteredCount}/{products.length} entered
          </span>
        </div>

        <div className="flex gap-1.5">
          {(
            [
              ["all", "All", products.length],
              ["missing", "Missing", missingCount],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={`min-h-11 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
                filter === id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {label}
              <span className="ml-1 opacity-65 tabular-nums">{count}</span>
            </button>
          ))}
        </div>
      </header>

      {isStale && (
        <div className="flex flex-none items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="text-[13px] text-amber-900">
            This closing was started on {dateLabel(startedAt)}.
          </p>
          <button
            type="button"
            onClick={startNewClosing}
            className="flex-none rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Start new
          </button>
        </div>
      )}

      {dropped > 0 && (
        <p className="flex-none border-b border-slate-200 bg-slate-50 px-4 py-2 text-[13px] text-slate-600">
          {dropped} saved {dropped === 1 ? "entry" : "entries"} referred to
          products that are no longer in the list, and {dropped === 1 ? "was" : "were"}{" "}
          dropped.
        </p>
      )}

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pt-3.5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {groups.map((group) => {
          const isCollapsed = collapsed[group.id] ?? true;
          return (
            <section key={group.id} className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() =>
                  setCollapsed((c) => ({ ...c, [group.id]: !isCollapsed }))
                }
                aria-expanded={!isCollapsed}
                className="flex min-h-11 items-center justify-between gap-2.5 rounded-[11px] bg-slate-100 px-3.5 py-3 text-left"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex-none text-[17px] leading-none">
                    {GROUP_EMOJI[group.id] ?? "📦"}
                  </span>
                  <span className="text-[15px] font-bold text-slate-800">
                    {group.label}
                  </span>
                </span>
                <span className="flex flex-none items-center gap-2">
                  <span className="text-[12.5px] font-semibold tabular-nums text-slate-500">
                    {group.products.length}
                    {group.products.length !== group.total && `/${group.total}`}
                  </span>
                  <Chevron open={!isCollapsed} />
                </span>
              </button>

              {!isCollapsed && (
                <ul className="flex flex-col gap-2">
                  {group.products.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      config={config}
                      entries={entries}
                      expanded={expandedId === product.id}
                      onToggle={() =>
                        setExpandedId((id) =>
                          id === product.id ? null : product.id,
                        )
                      }
                      onAdd={addEntry}
                      onRemove={removeEntry}
                    />
                  ))}
                  {group.products.length === 0 && (
                    <li className="px-3.5 py-3 text-[13px] text-slate-400">
                      Everything in this group is entered.
                    </li>
                  )}
                </ul>
              )}
            </section>
          );
        })}

        <Link
          href="/summary"
          className="flex h-12 flex-none items-center justify-center rounded-xl bg-slate-900 text-[15px] font-semibold text-white no-underline"
        >
          Review &amp; export
        </Link>

        <div className="flex-none pt-2">
          {confirmingReset ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
              <span className="text-[13px] text-red-900">
                Delete all {entries.length}{" "}
                {entries.length === 1 ? "entry" : "entries"}?
              </span>
              <span className="flex flex-none gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={startNewClosing}
                  className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Delete
                </button>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              disabled={entries.length === 0}
              className="min-h-11 w-full rounded-xl border border-slate-200 py-3 text-[13px] font-medium text-slate-500 disabled:opacity-50"
            >
              Start new closing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`h-4 w-4 flex-none text-slate-500 transition-transform ${
        open ? "" : "-rotate-90"
      }`}
    >
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
