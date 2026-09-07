import containersJson from "@/config/containers.json";
import productsJson from "@/config/products.json";
import { resolveDefaultContainer } from "@/lib/config-helpers";

export const CLOSING_TIERS = ["daily", "weekly", "monthly"] as const;
export const UNITS = ["kg", "g", "db", "l"] as const;
export const PRODUCT_KINDS = ["weight", "count", "amount"] as const;

export type ClosingTier = (typeof CLOSING_TIERS)[number];
export type Unit = (typeof UNITS)[number];
export type ProductKind = (typeof PRODUCT_KINDS)[number];

/** A form a product can be measured in, e.g. peeled oranges. */
export interface Variant {
  id: string;
  label: string;
  /** Applied after the tare deduction: net = (raw - tare) * multiplier. */
  multiplier: number;
}

/** A bulk unit a counted product ships in, e.g. 800 cups per karton. */
export interface Pack {
  id: string;
  label: string;
  pieces: number;
}

export interface Product {
  id: string;
  /** Hungarian, exactly as Fruitisimo writes it on the sheet. */
  name: string;
  group: string;
  /**
   * `weight` goes on the scale (container tare, optional multiplier), `count`
   * is pieces (optionally boxes/packs), `amount` is a quantity read straight
   * off the stock and typed in - the monthly sheet's litres, which no scale
   * and no piece count produces.
   */
  kind: ProductKind;
  unit: Unit;
  tiers: ClosingTier[];
  variants?: Variant[];
  packs?: Pack[];
  /**
   * Container id pre-selected when this product is weighed. Overrides the
   * group's default; staff can still pick another one.
   */
  defaultContainer?: string;
  /** A blank "Szezonális" row on the sheet — staff name it when entering. */
  seasonal?: boolean;
}

export interface ProductGroup {
  id: string;
  label: string;
  unit: Unit;
  /**
   * Container pre-selected for every weighed product in the group - ice cream
   * always goes in the ice cream tray, so that group sets it once here.
   */
  defaultContainer?: string;
}

export interface Container {
  id: string;
  name: string;
  group: string;
  /** Grams. Every tare in containers.md is grams, so all of them are. */
  tare: number;
}

export interface AppConfig {
  groups: ProductGroup[];
  products: Product[];
  containers: Container[];
}

function validate(config: AppConfig): void {
  const problems: string[] = [];
  const groupIds = new Set(config.groups.map((g) => g.id));
  const seen = new Set<string>();

  const containerIds = new Set<string>();
  for (const c of config.containers) {
    if (containerIds.has(c.id)) problems.push(`duplicate container id "${c.id}"`);
    containerIds.add(c.id);
    if (!(c.tare >= 0)) problems.push(`${c.id}: tare ${c.tare} is negative`);
  }

  for (const group of config.groups) {
    if (!UNITS.includes(group.unit)) {
      problems.push(`group ${group.id}: unknown unit "${group.unit}"`);
    }
    if (group.defaultContainer && !containerIds.has(group.defaultContainer)) {
      problems.push(
        `group ${group.id}: unknown default container "${group.defaultContainer}"`,
      );
    }
  }

  for (const p of config.products) {
    if (seen.has(p.id)) problems.push(`duplicate product id "${p.id}"`);
    seen.add(p.id);

    if (!groupIds.has(p.group)) {
      problems.push(`${p.id}: unknown group "${p.group}"`);
    }
    if (!PRODUCT_KINDS.includes(p.kind)) {
      problems.push(`${p.id}: unknown kind "${p.kind}"`);
    }
    if (!UNITS.includes(p.unit)) {
      problems.push(`${p.id}: unknown unit "${p.unit}"`);
    }
    if (p.tiers.length === 0) {
      problems.push(`${p.id}: belongs to no closing tier`);
    }
    for (const tier of p.tiers) {
      if (!CLOSING_TIERS.includes(tier)) {
        problems.push(`${p.id}: unknown tier "${tier}"`);
      }
    }

    // Phase 0 confirmed multipliers scale a peeled weight *up* to a
    // whole-fruit equivalent, so anything below 1 is a data entry mistake.
    for (const v of p.variants ?? []) {
      if (!(v.multiplier >= 1)) {
        problems.push(`${p.id}/${v.id}: multiplier ${v.multiplier} is below 1`);
      }
    }
    // Packs must run largest first (karton is a box, csomag a pack inside
    // it), because the entry flow shows them in this order and multiplies
    // each one up to pieces.
    let previous = Infinity;
    for (const pack of p.packs ?? []) {
      if (!Number.isInteger(pack.pieces) || pack.pieces <= 0) {
        problems.push(`${p.id}/${pack.id}: pieces must be a positive integer`);
      }
      if (pack.pieces >= previous) {
        problems.push(
          `${p.id}/${pack.id}: packs must be ordered largest first`,
        );
      }
      previous = pack.pieces;
    }

    if (p.kind !== "weight" && p.variants) {
      problems.push(`${p.id}: only weighed products can have variants`);
    }
    if (p.kind !== "count" && p.packs) {
      problems.push(`${p.id}: only counted products can have packs`);
    }
    // The scale reads grams, so a weighed product has to report in a weight
    // unit; pieces are always "db". `amount` is deliberately unconstrained -
    // it is whatever the sheet writes in that row.
    if (p.kind === "weight" && p.unit !== "kg" && p.unit !== "g") {
      problems.push(`${p.id}: weighed products must be kg or g, not "${p.unit}"`);
    }
    if (p.kind === "count" && p.unit !== "db") {
      problems.push(`${p.id}: counted products must be db, not "${p.unit}"`);
    }
    if (p.defaultContainer && !containerIds.has(p.defaultContainer)) {
      problems.push(
        `${p.id}: unknown default container "${p.defaultContainer}"`,
      );
    }
    // Only weighed products go on the scale, so a tare is meaningless anywhere
    // else.
    if (p.kind !== "weight" && p.defaultContainer) {
      problems.push(`${p.id}: only weighed products can have a default container`);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid config in config/*.json:\n  - ${problems.join("\n  - ")}`,
    );
  }
}

// The JSON imports widen to `string`, so the cast is what the validation above
// earns: anything that survives validate() genuinely matches these types.
const config: AppConfig = {
  groups: productsJson.groups as ProductGroup[],
  products: productsJson.products as Product[],
  containers: containersJson.containers as Container[],
};

validate(config);

export function getConfig(): AppConfig {
  return config;
}

export function productsForTier(tier: ClosingTier): Product[] {
  return config.products.filter((p) => p.tiers.includes(tier));
}

/**
 * The container to pre-select for a weighed product: its own default, else its
 * group's, else none - staff pick from the full list either way.
 */
export function defaultContainerFor(product: Product): Container | undefined {
  return resolveDefaultContainer(config, product);
}
