import type { Unit } from "@/lib/config";

/**
 * How a quantity is written for staff and for the report. Trailing zeros are
 * dropped because "2.786 kg" reads better than "2.786000", and counts are
 * whole things.
 */
export function formatQuantity(value: number, unit: Unit): string {
  switch (unit) {
    case "kg":
      return trim(value.toFixed(3));
    case "l":
      return trim(value.toFixed(2));
    case "g":
    case "db":
      return String(Math.round(value));
  }
}

export function formatWithUnit(value: number, unit: Unit): string {
  return `${formatQuantity(value, unit)} ${unit}`;
}

function trim(text: string): string {
  return text.includes(".") ? text.replace(/\.?0+$/, "") : text;
}
