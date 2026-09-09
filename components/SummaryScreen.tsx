"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import type { AppConfig } from "@/lib/config";
import type { Entry } from "@/lib/entries";
import { formatQuantity } from "@/lib/format";
import { entryLabel } from "@/lib/labels";
import { parseSession, today } from "@/lib/session";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/session-store";
import { buildSummary } from "@/lib/summary";

const NO_ENTRIES: Entry[] = [];

const TIER_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

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

function dateLabel(isoDay: string): string {
  const [year, month, day] = isoDay.split("-").map(Number);
  return new Date(year!, month! - 1, day!).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SummaryScreen({ config }: { config: AppConfig }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const knownIds = useMemo(
    () => new Set(config.products.map((p) => p.id)),
    [config.products],
  );
  const restored = useMemo(() => parseSession(raw, knownIds), [raw, knownIds]);

  const entries = restored?.session.entries ?? NO_ENTRIES;
  const tier = restored?.session.tier ?? "daily";
  const startedAt = restored?.session.startedAt ?? today();

  const summary = useMemo(
    () => buildSummary(config, tier, entries),
    [config, tier, entries],
  );

  const [exportState, setExportState] = useState<"idle" | "working" | "failed">(
    "idle",
  );

  async function exportXlsx() {
    setExportState("working");
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: 1, tier, startedAt, entries }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fruitisimo-${tier}-${startedAt}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportState("idle");
    } catch {
      setExportState("failed");
    }
  }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-white text-slate-900">
      <header className="flex flex-none flex-col gap-2.5 border-b border-slate-200 px-4 pt-3.5 pb-3">
        <Link
          href="/"
          className="-ml-1 inline-flex min-h-11 items-center px-1 text-[13px] font-medium text-emerald-700 no-underline"
        >
          ← Back to entry
        </Link>
        <div className="flex items-baseline justify-between">
          <h1 className="text-[17px] font-semibold tracking-tight">
            {TIER_LABELS[tier] ?? tier} closing
          </h1>
          <span className="text-xs text-slate-400">{dateLabel(startedAt)}</span>
        </div>
        <div className="flex gap-2">
          <Stat value={summary.enteredCount} label="entered" />
          <Stat value={summary.missingCount} label="not entered" warn />
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pt-3.5 pb-6">
        {summary.groups.length === 0 && (
          <p className="text-[13px] text-slate-500">
            Nothing entered yet. Go back and weigh something.
          </p>
        )}

        {summary.groups.map(({ group, lines }) => (
          <section key={group.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2.5 rounded-[11px] bg-slate-100 px-3.5 py-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="flex-none text-[17px] leading-none">
                  {GROUP_EMOJI[group.id] ?? "📦"}
                </span>
                <span className="text-[15px] font-bold text-slate-800">
                  {group.label}
                </span>
              </span>
              <span className="text-xs text-slate-500">{group.unit}</span>
            </div>

            <ul className="flex flex-col">
              {lines.map(({ product, total, entries: forms }) => (
                <li
                  key={product.id}
                  className="border-b border-slate-100 py-2.5 last:border-b-0"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[14.5px]">{product.name}</span>
                    <span className="text-[15px] font-semibold tabular-nums">
                      {formatQuantity(total, product.unit)}
                    </span>
                  </div>
                  {forms.length > 1 && (
                    <p className="mt-1 text-xs text-slate-500">
                      {forms
                        .map((entry) => entryLabel(entry, product, config))
                        .join("  +  ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        {summary.missing.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Not entered ({summary.missingCount})
            </h2>
            <ul className="flex flex-wrap gap-1.5">
              {summary.missing.map((product) => (
                <li
                  key={product.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
                >
                  {product.name}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <footer className="flex flex-none flex-col gap-1.5 border-t border-slate-200 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={exportXlsx}
          disabled={summary.enteredCount === 0 || exportState === "working"}
          className="h-12 flex-none rounded-xl bg-emerald-700 text-[15px] font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400"
        >
          {exportState === "working" ? "Preparing…" : "Export .xlsx"}
        </button>
        {exportState === "failed" ? (
          <p className="text-center text-xs text-red-700">
            The file could not be prepared. Check the connection and try again —
            nothing was lost.
          </p>
        ) : (
          <p className="text-center text-xs text-slate-400">
            Missing items still export — this is a snapshot, not a gate.
          </p>
        )}
      </footer>
    </div>
  );
}

function Stat({
  value,
  label,
  warn = false,
}: {
  value: number;
  label: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`flex flex-1 items-baseline gap-1.5 rounded-[10px] px-3 py-2 ${
        warn && value > 0 ? "bg-amber-50" : "bg-slate-100"
      }`}
    >
      <span
        className={`text-[17px] font-bold tabular-nums ${
          warn && value > 0 ? "text-amber-800" : "text-slate-900"
        }`}
      >
        {value}
      </span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}
