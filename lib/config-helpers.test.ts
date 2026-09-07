import { describe, expect, it } from "vitest";

import {
  defaultContainerFor,
  getConfig,
  type AppConfig,
} from "@/lib/config";
import {
  containerGroups,
  containersInGroup,
  parseDecimal,
  resolveDefaultContainer,
} from "@/lib/config-helpers";

const config = getConfig();

describe("parseDecimal", () => {
  // Staff type on a Hungarian/Czech keyboard: the comma is the decimal key.
  it("reads a comma as the decimal separator", () => {
    expect(parseDecimal("2,34")).toBe(2.34);
    expect(parseDecimal("0,5")).toBe(0.5);
  });

  it("still reads a plain period", () => {
    expect(parseDecimal("2.34")).toBe(2.34);
  });

  it("ignores whitespace around the number", () => {
    expect(parseDecimal("  1200 ")).toBe(1200);
  });

  it("returns NaN for something that is not a number at all", () => {
    expect(parseDecimal("abc")).toBeNaN();
    expect(parseDecimal("1,2,3")).toBeNaN();
  });

  // Number("") is 0, not NaN, so an empty field would otherwise read as a
  // valid zero. Both forms check for an empty string before trusting this.
  it("returns 0 for an empty string, which callers must guard separately", () => {
    expect(parseDecimal("")).toBe(0);
    expect(parseDecimal("   ")).toBe(0);
  });
});

describe("resolveDefaultContainer", () => {
  // This is the pure half of the pair: the client fetches its own config over
  // /api/config and passes it in, so the answer has to come from that argument
  // rather than from whatever the module happens to have loaded.
  it("reads the config it is handed, not the one bundled in", () => {
    const vanilia = config.products.find((p) => p.id === "icecream-vanilia")!;
    const otherConfig: AppConfig = {
      ...config,
      groups: config.groups.map((g) =>
        g.id === "icecream" ? { ...g, defaultContainer: "metal-mini" } : g,
      ),
    };

    expect(resolveDefaultContainer(config, vanilia)?.id).toBe(
      "metal-icecream-tray",
    );
    expect(resolveDefaultContainer(otherConfig, vanilia)?.id).toBe("metal-mini");
  });

  it("matches the server-side defaultContainerFor for the loaded config", () => {
    const vanilia = config.products.find((p) => p.id === "icecream-vanilia")!;
    expect(resolveDefaultContainer(config, vanilia)?.id).toBe(
      defaultContainerFor(vanilia)?.id,
    );
  });

  it("prefers a product's own default over its group's", () => {
    const vanilia = config.products.find((p) => p.id === "icecream-vanilia")!;
    const overridden = { ...vanilia, defaultContainer: "metal-mini" };

    expect(resolveDefaultContainer(config, vanilia)?.id).toBe(
      "metal-icecream-tray",
    );
    expect(resolveDefaultContainer(config, overridden)?.id).toBe("metal-mini");
  });

  it("returns nothing when the id names a container that is gone", () => {
    const vanilia = config.products.find((p) => p.id === "icecream-vanilia")!;
    const broken = { ...vanilia, defaultContainer: "metal-huge" };
    expect(resolveDefaultContainer(config, broken)).toBeUndefined();
  });
});

describe("the container picker's grouping", () => {
  it("lists each container group once, in config order", () => {
    expect(containerGroups(config)).toEqual(["none", "Metal", "Plastic", "Deco"]);
  });

  it("partitions the containers: every one appears in exactly one group", () => {
    const grouped = containerGroups(config).flatMap((group) =>
      containersInGroup(config, group),
    );
    expect(grouped.map((c) => c.id).sort()).toEqual(
      config.containers.map((c) => c.id).sort(),
    );
  });

  it("keeps the trays in the order they are configured, smallest first", () => {
    expect(containersInGroup(config, "Metal").map((c) => c.tare)).toEqual([
      19, 276, 378, 492, 620, 750,
    ]);
  });

  it("returns nothing for a group that does not exist", () => {
    expect(containersInGroup(config, "Wooden")).toEqual([]);
  });
});
