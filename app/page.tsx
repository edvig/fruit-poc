"use client";

import { useEffect, useState } from "react";
import type { AppConfig } from "@/lib/config";

type Check<T> =
  | { status: "loading" }
  | { status: "ok"; data: T }
  | { status: "error"; message: string };

function useApi<T>(path: string): Check<T> {
  const [state, setState] = useState<Check<T>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then((data) => {
        if (!cancelled) setState({ status: "ok", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}

export default function Home() {
  const health = useApi<{ ok?: boolean }>("/api/health");
  const config = useApi<AppConfig>("/api/config");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          Fruitisimo Closing
        </h1>
        <p className="mt-1 text-sm text-slate-500">Phase 1 — Step 2 skeleton</p>
      </header>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-medium text-slate-500">Backend check</h2>
        {health.status === "loading" && (
          <p className="mt-2 text-slate-600">Checking /api/health…</p>
        )}
        {health.status === "ok" && (
          <p className="mt-2 text-lg font-medium text-emerald-700">
            {health.data.ok ? "Health check succeeded" : "API did not report ok"}
          </p>
        )}
        {health.status === "error" && (
          <p className="mt-2 text-lg font-medium text-red-700">
            Could not reach the API: {health.message}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-medium text-slate-500">Config check</h2>
        {config.status === "loading" && (
          <p className="mt-2 text-slate-600">Loading /api/config…</p>
        )}
        {config.status === "ok" && (
          <ul className="mt-2 space-y-1 text-slate-700">
            <li>
              <span className="font-medium text-slate-900">
                {config.data.products.length}
              </span>{" "}
              products in{" "}
              <span className="font-medium text-slate-900">
                {config.data.groups.length}
              </span>{" "}
              groups
            </li>
            <li>
              <span className="font-medium text-slate-900">
                {config.data.products.filter((p) => p.tiers.includes("daily"))
                  .length}
              </span>{" "}
              measured daily
            </li>
            <li>
              <span className="font-medium text-slate-900">
                {config.data.containers.length}
              </span>{" "}
              containers
            </li>
          </ul>
        )}
        {config.status === "error" && (
          <p className="mt-2 text-lg font-medium text-red-700">
            Could not load config: {config.message}
          </p>
        )}
      </section>
    </main>
  );
}
