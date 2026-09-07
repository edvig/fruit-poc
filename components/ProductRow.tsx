"use client";

import { useState } from "react";

import {
  checkCountEntry,
  checkWeightEntry,
  computeCountEntry,
  computeWeightEntry,
  type WeightProblem,
} from "@/lib/calc";
import type { AppConfig, Container, Product } from "@/lib/config";
import {
  containerGroups,
  containersInGroup,
  parseDecimal,
  resolveDefaultContainer,
} from "@/lib/config-helpers";
import {
  entriesFor,
  entryValue,
  newEntryId,
  productTotal,
  type Entry,
} from "@/lib/entries";
import { formatWithUnit } from "@/lib/format";

const WEIGHT_PROBLEMS: Record<WeightProblem, string> = {
  "raw-not-positive": "Enter a weight above zero.",
  "raw-below-tare": "That's lighter than the container itself — wrong container?",
};

export default function ProductRow({
  product,
  config,
  entries,
  expanded,
  onToggle,
  onAdd,
  onRemove,
}: {
  product: Product;
  config: AppConfig;
  entries: Entry[];
  expanded: boolean;
  onToggle: () => void;
  onAdd: (entry: Entry) => void;
  onRemove: (entryId: string) => void;
}) {
  const mine = entriesFor(product.id, entries);
  const total = productTotal(product, entries);

  return (
    <li className="rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2.5 px-3.5 py-3 text-left"
      >
        <span className="text-[14.5px] font-medium">{product.name}</span>
        <span className="flex items-center gap-2">
          {mine.length > 0 ? (
            <span className="text-sm font-semibold tabular-nums">
              {formatWithUnit(total, product.unit)}
            </span>
          ) : (
            <span className="text-[12.5px] font-medium text-amber-700">
              Not entered
            </span>
          )}
          <Chevron open={expanded} />
        </span>
      </button>

      {mine.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 px-3.5 pb-3">
          {mine.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1 pr-1 pl-2.5 text-xs text-slate-700"
            >
              {entryLabel(entry, product, config)}
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                aria-label={`Remove ${entryLabel(entry, product, config)}`}
                className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-200 text-slate-600"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {expanded && (
        <div className="mx-3.5 mb-3 flex flex-col gap-3 border-t border-dashed border-slate-200 pt-3">
          {product.kind === "weight" && (
            <WeightForm product={product} config={config} onAdd={onAdd} />
          )}
          {product.kind === "count" && (
            <CountForm product={product} onAdd={onAdd} />
          )}
          {product.kind === "amount" && (
            <AmountForm product={product} onAdd={onAdd} />
          )}
        </div>
      )}
    </li>
  );
}

function WeightForm({
  product,
  config,
  onAdd,
}: {
  product: Product;
  config: AppConfig;
  onAdd: (entry: Entry) => void;
}) {
  const preset = resolveDefaultContainer(config, product);
  const [container, setContainer] = useState<Container>(
    preset ?? config.containers[0]!,
  );
  const [variantId, setVariantId] = useState(product.variants?.[0]?.id);
  const [raw, setRaw] = useState("");

  const groups = containerGroups(config);
  const sizes = containersInGroup(config, container.group);
  const multiplier = product.variants?.find((v) => v.id === variantId)
    ?.multiplier;

  const value = parseDecimal(raw);
  const typed = raw.trim() !== "" && !Number.isNaN(value);
  const problem = typed
    ? checkWeightEntry({ raw: value, unit: product.unit, tareGrams: container.tare })
    : null;
  const preview =
    typed && !problem
      ? computeWeightEntry({
          raw: value,
          unit: product.unit,
          tareGrams: container.tare,
          multiplier,
        })
      : null;

  function add() {
    if (!preview) return;
    onAdd({
      id: newEntryId(),
      kind: "weight",
      productId: product.id,
      raw: value,
      containerId: container.id,
      variantId,
      netGrams: preview.netGrams,
    });
    // Container and form stay put: several trays of the same product in a row
    // is the normal case, and re-picking each time is what we're removing.
    setRaw("");
  }

  return (
    <>
      <div>
        <FieldLabel>Container</FieldLabel>
        <ChipScroll>
          {groups.map((group) => (
            <Chip
              key={group}
              active={container.group === group}
              onClick={() => setContainer(containersInGroup(config, group)[0]!)}
            >
              {group === "none" ? "None" : group}
            </Chip>
          ))}
        </ChipScroll>
        {sizes.length > 1 && (
          <ChipScroll className="mt-1.5">
            {sizes.map((size) => (
              <Chip
                key={size.id}
                active={container.id === size.id}
                onClick={() => setContainer(size)}
              >
                {size.name}{" "}
                <span className="opacity-60">{size.tare} g</span>
              </Chip>
            ))}
          </ChipScroll>
        )}
      </div>

      {product.variants && (
        <div>
          <FieldLabel>Form</FieldLabel>
          <div className="flex gap-1.5">
            {product.variants.map((variant) => (
              <Chip
                key={variant.id}
                active={variantId === variant.id}
                onClick={() => setVariantId(variant.id)}
              >
                {variant.label}
                {variant.multiplier !== 1 && (
                  <>
                    {" "}
                    <span className="opacity-60">×{variant.multiplier}</span>
                  </>
                )}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div>
        <FieldLabel>Raw weight</FieldLabel>
        <div className="flex items-center gap-2">
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            aria-label={`Raw weight for ${product.name} in ${product.unit}`}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 tabular-nums outline-none focus:border-slate-400"
          />
          <span className="text-sm text-slate-500">{product.unit}</span>
        </div>
      </div>

      <PreviewLine
        problem={problem ? WEIGHT_PROBLEMS[problem] : null}
        text={
          preview
            ? `Net ${formatWithUnit(preview.net, product.unit)}${
                container.tare > 0 ? ` · −${container.tare} g tare` : ""
              }${multiplier && multiplier !== 1 ? ` · ×${multiplier}` : ""}`
            : null
        }
      />

      <AddButton disabled={!preview} onClick={add} />
    </>
  );
}

function CountForm({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (entry: Entry) => void;
}) {
  const packs = product.packs ?? [];
  const [packCounts, setPackCounts] = useState<Record<string, number>>({});
  const [pieces, setPieces] = useState(0);

  const problem = checkCountEntry({ packCounts, pieces });
  const total = problem ? 0 : computeCountEntry({ packCounts, pieces, packs });

  function bump(id: string | null, delta: number) {
    if (id === null) {
      setPieces((p) => Math.max(0, p + delta));
      return;
    }
    setPackCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) }));
  }

  function add() {
    if (total <= 0) return;
    onAdd({
      id: newEntryId(),
      kind: "count",
      productId: product.id,
      packCounts,
      pieces,
      total,
    });
    setPackCounts({});
    setPieces(0);
  }

  return (
    <>
      {packs.map((pack) => (
        <Stepper
          key={pack.id}
          label={pack.label}
          hint={`${pack.pieces} db`}
          value={packCounts[pack.id] ?? 0}
          onChange={(delta) => bump(pack.id, delta)}
        />
      ))}
      <Stepper
        label="Loose pieces"
        value={pieces}
        onChange={(delta) => bump(null, delta)}
      />
      <PreviewLine problem={null} text={total > 0 ? `Total ${total} db` : null} />
      <AddButton disabled={total <= 0} onClick={add} />
    </>
  );
}

function AmountForm({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (entry: Entry) => void;
}) {
  const [text, setText] = useState("");
  const value = parseDecimal(text);
  const valid = text.trim() !== "" && !Number.isNaN(value) && value > 0;

  function add() {
    if (!valid) return;
    onAdd({
      id: newEntryId(),
      kind: "amount",
      productId: product.id,
      amount: value,
    });
    setText("");
  }

  return (
    <>
      <div>
        <FieldLabel>Amount</FieldLabel>
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            aria-label={`Amount for ${product.name} in ${product.unit}`}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 tabular-nums outline-none focus:border-slate-400"
          />
          <span className="text-sm text-slate-500">{product.unit}</span>
        </div>
      </div>
      <AddButton disabled={!valid} onClick={add} />
    </>
  );
}

function entryLabel(entry: Entry, product: Product, config: AppConfig): string {
  if (entry.kind === "weight") {
    const variant = product.variants?.find((v) => v.id === entry.variantId);
    const container = config.containers.find((c) => c.id === entry.containerId);
    const what = variant?.label ?? container?.name ?? "Weighed";
    return `${what} · ${formatWithUnit(entryValue(entry, product.unit), product.unit)}`;
  }
  if (entry.kind === "count") return `${entry.total} db`;
  return formatWithUnit(entry.amount, product.unit);
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
      {children}
    </div>
  );
}

function ChipScroll({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex gap-1.5 overflow-x-auto pb-0.5 ${className}`}>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-none rounded-full border px-3 py-2 text-[13px] whitespace-nowrap ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

function Stepper({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (delta: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">
        {label}
        {hint && <span className="text-xs text-slate-400"> {hint}</span>}
      </span>
      <span className="flex items-center gap-2">
        <StepperButton label={`Fewer ${label}`} onClick={() => onChange(-1)}>
          –
        </StepperButton>
        <span className="w-8 text-center font-semibold tabular-nums">
          {value}
        </span>
        <StepperButton label={`More ${label}`} onClick={() => onChange(1)}>
          +
        </StepperButton>
      </span>
    </div>
  );
}

function StepperButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="h-11 w-11 rounded-lg border border-slate-200 text-lg leading-none text-slate-700"
    >
      {children}
    </button>
  );
}

function PreviewLine({
  problem,
  text,
}: {
  problem: string | null;
  text: string | null;
}) {
  if (problem)
    return <p className="text-[13px] font-medium text-red-700">{problem}</p>;
  return (
    <p className="text-[13px] font-medium text-emerald-700">
      {text ?? " "}
    </p>
  );
}

function AddButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-12 rounded-xl bg-emerald-700 font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400"
    >
      Add to closing
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`h-4 w-4 flex-none text-slate-400 transition-transform ${
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
