import type { AppConfig, Container, Product } from "@/lib/config";

/**
 * Pure counterpart to `defaultContainerFor`, taking the config explicitly so
 * client components can use it without pulling the whole JSON config into the
 * browser bundle.
 */
export function resolveDefaultContainer(
  config: AppConfig,
  product: Product,
): Container | undefined {
  if (product.kind !== "weight") return undefined;
  const id =
    product.defaultContainer ??
    config.groups.find((g) => g.id === product.group)?.defaultContainer;
  return id ? config.containers.find((c) => c.id === id) : undefined;
}

/** Containers grouped the way the picker shows them: group first, size after. */
export function containerGroups(config: AppConfig): string[] {
  return [...new Set(config.containers.map((c) => c.group))];
}

export function containersInGroup(
  config: AppConfig,
  group: string,
): Container[] {
  return config.containers.filter((c) => c.group === group);
}

/**
 * Staff type on a Hungarian/Czech keyboard, where the decimal separator is a
 * comma. "2,34" has to mean 2.34 kg, not NaN.
 */
export function parseDecimal(text: string): number {
  return Number(text.trim().replace(",", "."));
}
