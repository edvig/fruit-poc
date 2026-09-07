import { describe, expect, it } from "vitest";

import {
  validateConfig,
  type AppConfig,
  type Container,
  type Pack,
  type Product,
  type ProductGroup,
  type Variant,
} from "@/lib/config";

/**
 * `config/*.json` is hand-edited — 132 products written out by hand from the
 * xlsx — so the validator is the only thing between a typo and a wrong number
 * at the register. These tests break a good config on purpose, one rule at a
 * time, to prove each rule actually fires.
 *
 * The parts come back named rather than indexed so a test reads as the mistake
 * it is making: `({ narancs }) => narancs.group = "frutti"`.
 */
function parts() {
  const fresh: ProductGroup = { id: "fresh", label: "Fresh", unit: "kg" };
  const accessories: ProductGroup = {
    id: "accessories",
    label: "Accessories",
    unit: "db",
  };

  const peeled: Variant = { id: "peeled", label: "Peeled", multiplier: 1.35 };
  const karton: Pack = { id: "karton", label: "karton", pieces: 800 };
  const csomag: Pack = { id: "csomag", label: "csomag", pieces: 50 };

  const narancs: Product = {
    id: "fresh-narancs",
    name: "Narancs",
    group: "fresh",
    kind: "weight",
    unit: "kg",
    tiers: ["daily"],
    variants: [peeled],
  };
  const pohar: Product = {
    id: "acc-pohar",
    name: "Pohár",
    group: "accessories",
    kind: "count",
    unit: "db",
    tiers: ["weekly"],
    packs: [karton, csomag],
  };
  const tej: Product = {
    id: "egyeb-tej",
    name: "Tej",
    group: "accessories",
    kind: "amount",
    unit: "l",
    tiers: ["monthly"],
  };

  const noContainer: Container = {
    id: "none",
    name: "No container",
    group: "none",
    tare: 0,
  };
  const smallTray: Container = {
    id: "metal-small",
    name: "Small",
    group: "Metal",
    tare: 276,
  };

  const config: AppConfig = {
    groups: [fresh, accessories],
    products: [narancs, pohar, tej],
    containers: [noContainer, smallTray],
  };

  return {
    config,
    fresh,
    narancs,
    peeled,
    pohar,
    karton,
    csomag,
    tej,
    smallTray,
  };
}

type Parts = ReturnType<typeof parts>;

/** Applies one break to a fresh config and returns what the validator says. */
function complaintFrom(breakIt: (parts: Parts) => void): string {
  const built = parts();
  breakIt(built);
  try {
    validateConfig(built.config);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected the config to be rejected, but it passed");
}

describe("the config validator", () => {
  it("accepts a well-formed config", () => {
    expect(() => validateConfig(parts().config)).not.toThrow();
  });

  it("catches a product pointing at a group that does not exist", () => {
    expect(complaintFrom(({ narancs }) => (narancs.group = "frutti"))).toMatch(
      /unknown group "frutti"/,
    );
  });

  it("catches two products sharing an id", () => {
    expect(complaintFrom(({ pohar }) => (pohar.id = "fresh-narancs"))).toMatch(
      /duplicate product id "fresh-narancs"/,
    );
  });

  it("catches two containers sharing an id", () => {
    expect(complaintFrom(({ smallTray }) => (smallTray.id = "none"))).toMatch(
      /duplicate container id "none"/,
    );
  });

  it("catches a product in no closing at all", () => {
    expect(complaintFrom(({ narancs }) => (narancs.tiers = []))).toMatch(
      /belongs to no closing tier/,
    );
  });

  it("catches an invented closing tier", () => {
    expect(
      complaintFrom(({ narancs }) => {
        narancs.tiers = ["yearly" as never];
      }),
    ).toMatch(/unknown tier "yearly"/);
  });

  // Phase 0: multipliers scale a peeled weight *up* to a whole-fruit
  // equivalent, so anything below 1 is a data entry mistake.
  it("catches a multiplier below 1", () => {
    expect(complaintFrom(({ peeled }) => (peeled.multiplier = 0.65))).toMatch(
      /multiplier 0\.65 is below 1/,
    );
  });

  it("catches packs written smallest-first", () => {
    expect(
      complaintFrom(({ pohar, karton, csomag }) => {
        pohar.packs = [csomag, karton];
      }),
    ).toMatch(/packs must be ordered largest first/);
  });

  it("catches a pack size that is not a whole number of pieces", () => {
    expect(complaintFrom(({ csomag }) => (csomag.pieces = 12.5))).toMatch(
      /pieces must be a positive integer/,
    );
  });

  it("catches a negative tare", () => {
    expect(complaintFrom(({ smallTray }) => (smallTray.tare = -276))).toMatch(
      /tare -276 is negative/,
    );
  });

  describe("keeps each product kind to the fields that make sense for it", () => {
    it("rejects variants on anything but a weighed product", () => {
      expect(
        complaintFrom(({ pohar, peeled }) => {
          pohar.variants = [peeled];
        }),
      ).toMatch(/only weighed products can have variants/);
    });

    it("rejects packs on anything but a counted product", () => {
      expect(
        complaintFrom(({ narancs, karton }) => {
          narancs.packs = [karton];
        }),
      ).toMatch(/only counted products can have packs/);
    });

    it("rejects a default container on anything but a weighed product", () => {
      expect(
        complaintFrom(({ tej }) => (tej.defaultContainer = "metal-small")),
      ).toMatch(/only weighed products can have a default container/);
    });

    it("rejects a weighed product that does not report in kg or g", () => {
      expect(complaintFrom(({ narancs }) => (narancs.unit = "db"))).toMatch(
        /weighed products must be kg or g, not "db"/,
      );
    });

    it("rejects a counted product that does not report in db", () => {
      expect(complaintFrom(({ pohar }) => (pohar.unit = "kg"))).toMatch(
        /counted products must be db, not "kg"/,
      );
    });
  });

  describe("default containers must be real containers", () => {
    it("catches an unknown id on a product", () => {
      expect(
        complaintFrom(({ narancs }) => (narancs.defaultContainer = "metal-huge")),
      ).toMatch(/unknown default container "metal-huge"/);
    });

    it("catches an unknown id on a group", () => {
      expect(
        complaintFrom(({ fresh }) => (fresh.defaultContainer = "metal-huge")),
      ).toMatch(/group fresh: unknown default container "metal-huge"/);
    });
  });

  it("reports every problem at once, not just the first", () => {
    const message = complaintFrom(({ narancs, pohar, smallTray }) => {
      narancs.group = "frutti";
      pohar.tiers = [];
      smallTray.tare = -1;
    });

    expect(message).toMatch(/unknown group "frutti"/);
    expect(message).toMatch(/belongs to no closing tier/);
    expect(message).toMatch(/tare -1 is negative/);
  });
});
