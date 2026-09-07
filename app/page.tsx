"use client";

import { useEffect, useState } from "react";

type Health =
  | { status: "loading" }
  | { status: "ok" }
  | { status: "unexpected" }
  | { status: "error"; message: string };

export default function Home() {
  const [health, setHealth] = useState<Health>({ status: "loading" });

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ ok?: boolean }>;
      })
      .then((data) => setHealth({ status: data.ok ? "ok" : "unexpected" }))
      .catch((err: unknown) =>
        setHealth({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        }),
      );
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          Fruitisimo Closing
        </h1>
        <p className="mt-1 text-sm text-slate-500">Phase 1 — Step 1 skeleton</p>
      </header>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-medium text-slate-500">Backend check</h2>
        {health.status === "loading" && (
          <p className="mt-2 text-slate-600">Checking /api/health…</p>
        )}
        {health.status === "ok" && (
          <p className="mt-2 text-lg font-medium text-emerald-700">
            Health check succeeded
          </p>
        )}
        {health.status === "unexpected" && (
          <p className="mt-2 text-lg font-medium text-amber-700">
            Reached the API, but it did not report ok
          </p>
        )}
        {health.status === "error" && (
          <p className="mt-2 text-lg font-medium text-red-700">
            Could not reach the API: {health.message}
          </p>
        )}
      </section>
    </main>
  );
}
