import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import SummaryScreen from "@/components/SummaryScreen";
import { getConfig } from "@/lib/config";
import type { Entry } from "@/lib/entries";
import { STORAGE_KEY, serialiseSession } from "@/lib/session";
import { resetStoreForTests } from "@/lib/session-store";

const config = getConfig();

afterEach(() => {
  cleanup();
  resetStoreForTests();
  localStorage.clear();
});

function seed(entries: Entry[], tier: "daily" | "weekly" = "daily") {
  localStorage.setItem(
    STORAGE_KEY,
    serialiseSession({ version: 1, tier, startedAt: "2026-09-08", entries }),
  );
}

const orangePeeled: Entry = {
  id: "a",
  kind: "weight",
  productId: "fresh-narancs",
  raw: 2.34,
  containerId: "metal-small",
  variantId: "peeled",
  netGrams: 2786,
};

const orangeWhole: Entry = {
  id: "b",
  kind: "weight",
  productId: "fresh-narancs",
  raw: 5,
  containerId: "metal-medium",
  variantId: "whole",
  netGrams: 4622,
};

describe("the review screen", () => {
  it("shows a multi-form product's total with its parts underneath", () => {
    seed([orangePeeled, orangeWhole]);
    render(<SummaryScreen config={config} />);

    expect(screen.getByText("Narancs")).toBeDefined();
    expect(screen.getByText("7.408")).toBeDefined();
    expect(screen.getByText(/Peeled · 2\.786 kg\s+\+\s+Whole · 4\.622 kg/)).toBeDefined();
  });

  it("does not clutter a single-entry product with a breakdown", () => {
    seed([{ ...orangePeeled, productId: "fresh-alma", variantId: undefined }]);
    render(<SummaryScreen config={config} />);

    expect(screen.getByText("Alma")).toBeDefined();
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it("counts what is entered and what is still outstanding", () => {
    seed([orangePeeled, orangeWhole]);
    render(<SummaryScreen config={config} />);

    // Two entries, but one product.
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("entered")).toBeDefined();
    expect(screen.getByText("37")).toBeDefined();
    expect(screen.getByText("not entered")).toBeDefined();
  });

  it("lists the products nobody has entered yet", () => {
    seed([orangePeeled]);
    render(<SummaryScreen config={config} />);

    expect(screen.getByText(/Not entered \(37\)/)).toBeDefined();
    expect(screen.getByText("Alma")).toBeDefined();
  });

  it("names the closing type and the day it belongs to", () => {
    seed([orangePeeled], "weekly");
    render(<SummaryScreen config={config} />);

    expect(screen.getByText("Weekly closing")).toBeDefined();
    // en-GB abbreviates September as "Sept", not "Sep".
    expect(screen.getByText("8 Sept 2026")).toBeDefined();
  });

  it("says so plainly when nothing has been entered", () => {
    render(<SummaryScreen config={config} />);
    expect(screen.getByText(/Nothing entered yet/)).toBeDefined();
  });

  it("offers a way back to the entry screen", () => {
    render(<SummaryScreen config={config} />);
    expect(
      screen.getByRole("link", { name: /Back to entry/ }).getAttribute("href"),
    ).toBe("/");
  });
});
