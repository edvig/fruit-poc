"use client";

import React, { useState, useMemo } from "react";
import { Plus, Trash2, Copy, Check, RotateCcw, Scale } from "lucide-react";

// ---- Placeholder config -----------------------------------------------
// Swap this with Fruitisimo's real numbers once gathered (Phase 0).
const CONTAINERS = [
  { id: "none", name: "No container", tare: 0 },
  { id: "tray_s", name: "Small tray", tare: 0.15 },
  { id: "tray_l", name: "Large tray", tare: 0.32 },
  { id: "tub_ic", name: "Ice cream tub", tare: 0.45 },
];

const PRODUCTS = [
  {
    id: "orange",
    name: "Orange",
    kind: "weight",
    variants: [
      { id: "whole", label: "With peel", multiplier: 1 },
      { id: "peeled", label: "Peeled", multiplier: 0.75 },
    ],
  },
  {
    id: "apple",
    name: "Apple",
    kind: "weight",
    variants: [
      { id: "whole", label: "With peel", multiplier: 1 },
      { id: "peeled", label: "Peeled", multiplier: 0.8 },
    ],
  },
  {
    id: "watermelon",
    name: "Watermelon",
    kind: "weight",
    variants: [
      { id: "whole", label: "With rind", multiplier: 1 },
      { id: "peeled", label: "Rind removed", multiplier: 0.55 },
    ],
  },
  {
    id: "icecream_vanilla",
    name: "Ice cream — vanilla",
    kind: "weight",
    variants: [{ id: "std", label: "Standard", multiplier: 1 }],
  },
  {
    id: "icecream_choc",
    name: "Ice cream — chocolate",
    kind: "weight",
    variants: [{ id: "std", label: "Standard", multiplier: 1 }],
  },
  { id: "dessert_cup", name: "Dessert cup", kind: "count" },
  { id: "fruit_cup", name: "Fruit cup", kind: "count" },
  { id: "waffle", name: "Waffle", kind: "count" },
];

const BRAND = {
  dark: "#1F3D2B",
  darkText: "#16241C",
  bg: "#F4F5F0",
  card: "#FFFFFF",
  accent: "#D9A441",
  accentDark: "#8A6318",
  readoutBg: "#12241A",
  readoutDigits: "#FFC94A",
  border: "#E1E2D9",
  danger: "#C4432E",
};

function round(n, d = 3) {
  const f = Math.pow(10, d);
  return Math.round((n + Number.EPSILON) * f) / f;
}

export default function FruitisimoClosingPOC() {
  const [register, setRegister] = useState("Register 1");
  const [entries, setEntries] = useState([]);
  const [copied, setCopied] = useState(false);

  const [productId, setProductId] = useState(PRODUCTS[0].id);
  const [containerId, setContainerId] = useState(CONTAINERS[0].id);
  const [variantId, setVariantId] = useState(PRODUCTS[0].variants[0].id);
  const [rawWeight, setRawWeight] = useState("");
  const [count, setCount] = useState(1);

  const product = PRODUCTS.find((p) => p.id === productId);
  const container = CONTAINERS.find((c) => c.id === containerId);
  const variant = product?.variants?.find((v) => v.id === variantId);

  const netWeight = useMemo(() => {
    if (product?.kind !== "weight") return null;
    const raw = parseFloat(rawWeight);
    if (isNaN(raw)) return null;
    const tare = container?.tare ?? 0;
    const mult = variant?.multiplier ?? 1;
    return Math.max(0, round((raw - tare) * mult, 3));
  }, [rawWeight, container, variant, product]);

  function handleProductChange(id) {
    const p = PRODUCTS.find((p) => p.id === id);
    setProductId(id);
    if (p.kind === "weight") {
      setVariantId(p.variants[0].id);
      setRawWeight("");
    } else {
      setCount(1);
    }
  }

  function addEntry() {
    if (product.kind === "weight") {
      if (netWeight === null) return;
      setEntries((e) => [
        ...e,
        {
          id: Date.now(),
          productId,
          productName: product.name,
          kind: "weight",
          containerName: container.name,
          variantLabel: variant?.label,
          raw: parseFloat(rawWeight),
          net: netWeight,
        },
      ]);
      setRawWeight("");
    } else {
      if (!count || count < 1) return;
      setEntries((e) => [
        ...e,
        {
          id: Date.now(),
          productId,
          productName: product.name,
          kind: "count",
          net: count,
        },
      ]);
      setCount(1);
    }
  }

  function removeEntry(id) {
    setEntries((e) => e.filter((en) => en.id !== id));
  }

  function resetDay() {
    if (entries.length === 0 || window.confirm("Clear all of today's entries?")) {
      setEntries([]);
    }
  }

  const totals = useMemo(() => {
    const map = {};
    for (const e of entries) {
      if (!map[e.productId]) {
        map[e.productId] = { name: e.productName, kind: e.kind, total: 0 };
      }
      map[e.productId].total += e.net;
    }
    return Object.values(map).map((t) => ({ ...t, total: round(t.total, 3) }));
  }, [entries]);

  function buildReportText() {
    const date = new Date().toLocaleDateString();
    const lines = [`Fruitisimo — closing report`, `${register} — ${date}`, ""];
    if (totals.length === 0) {
      lines.push("(no entries)");
    } else {
      for (const t of totals) {
        lines.push(
          `${t.name}: ${t.total} ${t.kind === "weight" ? "kg" : "pcs"}`
        );
      }
    }
    return lines.join("\n");
  }

  function copyReport() {
    navigator.clipboard?.writeText(buildReportText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div style={{ background: BRAND.bg, minHeight: "100%" }} className="w-full font-sans">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 style={{ color: BRAND.dark }} className="text-xl font-bold tracking-tight">
              Fruitisimo
            </h1>
            <p style={{ color: BRAND.darkText }} className="text-xs opacity-70">
              Closing — {new Date().toLocaleDateString()}
            </p>
          </div>
          <input
            value={register}
            onChange={(e) => setRegister(e.target.value)}
            style={{ borderColor: BRAND.border, color: BRAND.darkText }}
            className="text-xs text-right border rounded px-2 py-1 w-24 bg-white"
          />
        </div>

        {/* Entry form */}
        <div
          style={{ background: BRAND.card, borderColor: BRAND.border }}
          className="rounded-xl border p-4 mb-4 shadow-sm"
        >
          <label style={{ color: BRAND.darkText }} className="text-xs font-semibold opacity-70">
            Product
          </label>
          <select
            value={productId}
            onChange={(e) => handleProductChange(e.target.value)}
            style={{ borderColor: BRAND.border }}
            className="w-full mt-1 mb-3 border rounded-lg px-3 py-2 text-sm bg-white"
          >
            {PRODUCTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {product.kind === "weight" ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label style={{ color: BRAND.darkText }} className="text-xs font-semibold opacity-70">
                    Container
                  </label>
                  <select
                    value={containerId}
                    onChange={(e) => setContainerId(e.target.value)}
                    style={{ borderColor: BRAND.border }}
                    className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {CONTAINERS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.tare} kg)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ color: BRAND.darkText }} className="text-xs font-semibold opacity-70">
                    Raw weight (kg)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0.00"
                    value={rawWeight}
                    onChange={(e) => setRawWeight(e.target.value)}
                    style={{ borderColor: BRAND.border }}
                    className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white"
                  />
                </div>
              </div>

              {product.variants.length > 1 && (
                <div className="mb-3">
                  <label style={{ color: BRAND.darkText }} className="text-xs font-semibold opacity-70">
                    Variant
                  </label>
                  <div className="flex gap-2 mt-1">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setVariantId(v.id)}
                        style={
                          variantId === v.id
                            ? { background: BRAND.dark, color: "white", borderColor: BRAND.dark }
                            : { borderColor: BRAND.border, color: BRAND.darkText }
                        }
                        className="flex-1 text-xs font-medium border rounded-lg py-2"
                      >
                        {v.label} (×{v.multiplier})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Scale readout */}
              <div
                style={{ background: BRAND.readoutBg }}
                className="rounded-lg px-4 py-3 mb-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-white/50 text-[11px]">
                  <Scale size={14} />
                  <span>
                    ({rawWeight || "0"} − {container.tare}) × {variant?.multiplier ?? 1}
                  </span>
                </div>
                <span
                  style={{ color: BRAND.readoutDigits, fontFamily: "monospace" }}
                  className="text-2xl font-bold tabular-nums"
                >
                  {netWeight !== null ? netWeight.toFixed(3) : "—"} kg
                </span>
              </div>
            </>
          ) : (
            <div className="mb-3">
              <label style={{ color: BRAND.darkText }} className="text-xs font-semibold opacity-70">
                Count
              </label>
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={() => setCount((c) => Math.max(0, c - 1))}
                  style={{ borderColor: BRAND.border }}
                  className="w-10 h-10 border rounded-lg text-lg font-bold bg-white"
                >
                  −
                </button>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 0)}
                  style={{ borderColor: BRAND.border }}
                  className="flex-1 text-center border rounded-lg px-3 py-2 text-lg font-bold bg-white"
                />
                <button
                  onClick={() => setCount((c) => c + 1)}
                  style={{ borderColor: BRAND.border }}
                  className="w-10 h-10 border rounded-lg text-lg font-bold bg-white"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <button
            onClick={addEntry}
            style={{ background: BRAND.accent, color: BRAND.accentDark }}
            className="w-full flex items-center justify-center gap-2 font-semibold rounded-lg py-2.5 text-sm"
          >
            <Plus size={16} /> Add to closing
          </button>
        </div>

        {/* Entries list */}
        {entries.length > 0 && (
          <div
            style={{ background: BRAND.card, borderColor: BRAND.border }}
            className="rounded-xl border p-4 mb-4 shadow-sm"
          >
            <h2 style={{ color: BRAND.darkText }} className="text-xs font-semibold opacity-70 mb-2">
              Today's entries ({entries.length})
            </h2>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {entries.map((e) => (
                <div
                  key={e.id}
                  style={{ borderColor: BRAND.border }}
                  className="flex items-center justify-between text-sm border-b pb-1.5 last:border-0"
                >
                  <div>
                    <div style={{ color: BRAND.darkText }} className="font-medium">
                      {e.productName}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {e.kind === "weight"
                        ? `${e.containerName}, ${e.variantLabel}, raw ${e.raw}kg`
                        : "counted"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: BRAND.dark }} className="font-mono font-semibold">
                      {e.kind === "weight" ? `${e.net.toFixed(3)} kg` : `${e.net} pcs`}
                    </span>
                    <button onClick={() => removeEntry(e.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div
          style={{ background: BRAND.dark }}
          className="rounded-xl p-4 mb-4 text-white"
        >
          <h2 className="text-xs font-semibold opacity-70 mb-2">Closing summary</h2>
          {totals.length === 0 ? (
            <p className="text-sm opacity-60">No entries yet.</p>
          ) : (
            <div className="space-y-1 mb-3">
              {totals.map((t) => (
                <div key={t.name} className="flex justify-between text-sm">
                  <span>{t.name}</span>
                  <span className="font-mono font-semibold">
                    {t.kind === "weight" ? `${t.total.toFixed(3)} kg` : `${t.total} pcs`}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={copyReport}
            style={{ background: "rgba(255,255,255,0.12)" }}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium rounded-lg py-2"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy report as text"}
          </button>
        </div>

        <button
          onClick={resetDay}
          className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 py-2"
        >
          <RotateCcw size={12} /> Reset day (demo only)
        </button>

        <p className="text-[11px] text-gray-400 text-center mt-2">
          POC — products, containers and multipliers are placeholders. No data is saved between sessions.
        </p>
      </div>
    </div>
  );
}
