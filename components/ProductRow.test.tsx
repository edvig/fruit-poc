import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import ProductRow from "@/components/ProductRow";
import { getConfig } from "@/lib/config";
import type { Entry } from "@/lib/entries";

afterEach(cleanup);

const config = getConfig();
const product = (id: string) => {
  const found = config.products.find((p) => p.id === id);
  if (!found) throw new Error(`no product ${id}`);
  return found;
};

/** Renders one row expanded, capturing whatever it commits. */
function setup(productId: string, entries: Entry[] = []) {
  const added: Entry[] = [];
  const removed: string[] = [];
  const onAdd = vi.fn((entry: Entry) => added.push(entry));
  const onRemove = vi.fn((entryId: string) => removed.push(entryId));
  render(
    <ul>
      <ProductRow
        product={product(productId)}
        config={config}
        entries={entries}
        expanded
        onToggle={() => {}}
        onAdd={onAdd}
        onRemove={onRemove}
      />
    </ul>,
  );
  return { added, removed, onAdd, onRemove, user: userEvent.setup() };
}

describe("weighing a product with a peeled variant", () => {
  it("matches the hand-checked orange case, typed with a comma", async () => {
    const { added, user } = setup("fresh-narancs");

    await user.click(screen.getByRole("button", { name: /^Metal$/ }));
    await user.click(screen.getByRole("button", { name: /Small 276 g/ }));
    await user.click(screen.getByRole("button", { name: /Peeled/ }));
    // Hungarian keyboards give a comma, not a period.
    await user.type(screen.getByLabelText(/Raw weight/), "2,34");

    // (2340 - 276) = 2064 * 1.35 = 2786.4 -> 2786 g
    expect(screen.getByText(/Net 2\.786 kg/)).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Add to closing" }));
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({
      kind: "weight",
      productId: "fresh-narancs",
      containerId: "metal-small",
      variantId: "peeled",
      netGrams: 2786,
    });
  });

  it("refuses a weight lighter than the container itself", async () => {
    const { added, user } = setup("fresh-narancs");
    await user.click(screen.getByRole("button", { name: /^Metal$/ }));
    await user.click(screen.getByRole("button", { name: /Small 276 g/ }));
    await user.type(screen.getByLabelText(/Raw weight/), "0.2");

    expect(screen.getByText(/wrong container/)).toBeDefined();
    const add = screen.getByRole("button", { name: "Add to closing" });
    expect(add.hasAttribute("disabled")).toBe(true);
    await user.click(add);
    expect(added).toHaveLength(0);
  });
});

describe("weighing a product with a default container", () => {
  it("preselects the ice cream tray and deducts its 750 g", async () => {
    const { added, user } = setup("icecream-vanilia");
    await user.type(screen.getByLabelText(/Raw weight/), "1200");

    expect(screen.getByText(/Net 450 g/)).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Add to closing" }));
    expect(added[0]).toMatchObject({
      containerId: "metal-icecream-tray",
      netGrams: 450,
    });
  });
});

describe("counting an accessory", () => {
  it("multiplies boxes and packs up to pieces", async () => {
    const { added, user } = setup("acc-pohar-0-3");

    await user.click(screen.getByRole("button", { name: "More karton" }));
    await user.click(screen.getByRole("button", { name: "More karton" }));
    await user.click(screen.getByRole("button", { name: "More csomag" }));

    // 2 * 800 + 1 * 50 = 1650
    expect(screen.getByText(/Total 1650 db/)).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Add to closing" }));
    expect(added[0]).toMatchObject({ kind: "count", total: 1650 });
  });

  it("never goes below zero", async () => {
    const { user } = setup("acc-pohar-0-3");
    await user.click(screen.getByRole("button", { name: "Fewer karton" }));
    const add = screen.getByRole("button", { name: "Add to closing" });
    expect(add.hasAttribute("disabled")).toBe(true);
  });
});

describe("a product already entered in several forms", () => {
  it("shows the summed total and each form separately", () => {
    const entries: Entry[] = [
      {
        id: "a",
        kind: "weight",
        productId: "fresh-narancs",
        raw: 2.34,
        containerId: "metal-small",
        variantId: "peeled",
        netGrams: 2786,
      },
      {
        id: "b",
        kind: "weight",
        productId: "fresh-narancs",
        raw: 5,
        containerId: "metal-medium",
        variantId: "whole",
        netGrams: 4622,
      },
    ];
    setup("fresh-narancs", entries);

    // 2786 + 4622 = 7408 g
    expect(screen.getByText("7.408 kg")).toBeDefined();
    const text = screen
      .getAllByRole("listitem")
      .map((item) => item.textContent ?? "");
    expect(text.some((t) => t.includes("Peeled · 2.786 kg"))).toBe(true);
    expect(text.some((t) => t.includes("Whole · 4.622 kg"))).toBe(true);
  });
});

describe("entering a litre product", () => {
  it("takes the typed amount as it stands - no container, no pack math", async () => {
    const { added, user } = setup("egyeb-tej");

    // No scale is involved, so there is nothing to pick before typing.
    expect(screen.queryByText("Container")).toBeNull();
    await user.type(screen.getByLabelText(/Amount for Tej in l/), "1,5");
    await user.click(screen.getByRole("button", { name: "Add to closing" }));

    expect(added).toEqual([
      expect.objectContaining({
        kind: "amount",
        productId: "egyeb-tej",
        amount: 1.5,
      }),
    ]);
  });

  it("refuses an empty or zero amount", async () => {
    const { added, user } = setup("egyeb-tej");
    const add = screen.getByRole("button", { name: "Add to closing" });
    expect(add.hasAttribute("disabled")).toBe(true);

    await user.type(screen.getByLabelText(/Amount for Tej/), "0");
    expect(add.hasAttribute("disabled")).toBe(true);
    await user.click(add);
    expect(added).toHaveLength(0);
  });

  it("sums several cartons into one total", () => {
    setup("egyeb-tej", [
      { id: "a", kind: "amount", productId: "egyeb-tej", amount: 6 },
      { id: "b", kind: "amount", productId: "egyeb-tej", amount: 1.5 },
    ]);
    expect(screen.getByText("7.5 l")).toBeDefined();
  });
});

describe("removing an entry", () => {
  const entries: Entry[] = [
    {
      id: "peeled-one",
      kind: "weight",
      productId: "fresh-narancs",
      raw: 2.34,
      containerId: "metal-small",
      variantId: "peeled",
      netGrams: 2786,
    },
    {
      id: "whole-one",
      kind: "weight",
      productId: "fresh-narancs",
      raw: 5,
      containerId: "metal-medium",
      variantId: "whole",
      netGrams: 4622,
    },
  ];

  it("removes the form that was actually clicked, not the first one", async () => {
    const { removed, user } = setup("fresh-narancs", entries);

    await user.click(
      screen.getByRole("button", { name: "Remove Whole · 4.622 kg" }),
    );

    expect(removed).toEqual(["whole-one"]);
  });

  it("offers a remove button for every entry", () => {
    setup("fresh-narancs", entries);
    expect(screen.getAllByRole("button", { name: /^Remove / })).toHaveLength(2);
  });
});

describe("telling entered products apart at a glance", () => {
  it("marks a product with entries as entered", () => {
    setup("fresh-alma", [
      {
        id: "a",
        kind: "weight",
        productId: "fresh-alma",
        raw: 2,
        containerId: "none",
        netGrams: 2000,
      },
    ]);
    // The entry chips are list items too; the product row is the outer one.
    const row = screen.getAllByRole("listitem")[0]!;
    expect(row.getAttribute("data-state")).toBe("entered");
    expect(row.className).toContain("bg-emerald-50");
  });

  it("leaves an untouched product plain", () => {
    setup("fresh-alma");
    const row = screen.getAllByRole("listitem")[0]!;
    expect(row.getAttribute("data-state")).toBe("empty");
    expect(row.className).not.toContain("emerald");
  });
});
