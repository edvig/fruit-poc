"use client";

import { useMemo, useState } from "react";

import ProductRow from "@/components/ProductRow";
import type { AppConfig, ClosingTier } from "@/lib/config";
import type { Entry } from "@/lib/entries";

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

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ClosingScreen({ config }: { config: AppConfig }) {
  const [tier, setTier] = useState<ClosingTier>("daily");
  const [filter, setFilter] = useState<"all" | "missing">("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);

  // How many entries each product has, for the progress bar and the Missing
  // filter. Step 6 persists `entries` to localStorage.
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
          <span className="text-xs text-slate-400">{todayLabel()}</span>
        </div>

        <div role="tablist" className="flex gap-1 rounded-[10px] bg-slate-100 p-[3px]">
          {TIERS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tier === t.id}
              onClick={() => setTier(t.id)}
              className={`flex-1 rounded-lg py-2 text-[13.5px] font-medium transition ${
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
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
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

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pt-3.5 pb-6">
        {groups.map((group) => {
          const isCollapsed = collapsed[group.id] ?? false;
          return (
            <section key={group.id} className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() =>
                  setCollapsed((c) => ({ ...c, [group.id]: !isCollapsed }))
                }
                aria-expanded={!isCollapsed}
                className="flex items-center justify-between gap-2.5 rounded-[11px] bg-slate-100 px-3.5 py-3 text-left"
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
                      onAdd={(entry) => setEntries((all) => [...all, entry])}
                      onRemove={(entryId) =>
                        setEntries((all) => all.filter((e) => e.id !== entryId))
                      }
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
