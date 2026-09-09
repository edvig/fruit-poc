import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import ClosingScreen from "@/components/ClosingScreen";
import { getConfig } from "@/lib/config";
import { STORAGE_KEY, serialiseSession, today } from "@/lib/session";
import { resetStoreForTests } from "@/lib/session-store";

const config = getConfig();

afterEach(() => {
  cleanup();
  resetStoreForTests();
  localStorage.clear();
});

/** Weighs 2 kg of apples with no container, the shortest real entry there is. */
async function weighApples(user: ReturnType<typeof userEvent.setup>) {
  await weigh(user, "Alma", "2");
}

/** Opens a weighed product's row, types a raw weight, and commits it. */
async function weigh(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  raw: string,
) {
  await openGroupOf(user, name);
  await user.click(screen.getByRole("button", { name: new RegExp(`^${name}`) }));
  await user.type(screen.getByLabelText(/Raw weight/), raw);
  await user.click(screen.getByRole("button", { name: "Add to closing" }));
}

/** Groups start closed, so nothing inside one is reachable until it is opened. */
async function openGroup(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  const header = screen.getByRole("button", { name: new RegExp(label) });
  if (header.getAttribute("aria-expanded") === "false") await user.click(header);
}

async function openGroupOf(
  user: ReturnType<typeof userEvent.setup>,
  productName: string,
) {
  const product = config.products.find((p) => p.name === productName);
  const group = config.groups.find((g) => g.id === product?.group);
  if (!group) throw new Error(`no group for ${productName}`);
  await openGroup(user, group.label);
}

describe("surviving a refresh mid-closing", () => {
  it("restores the entries, not just the fact that something was entered", async () => {
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);
    await weighApples(user);
    expect(screen.getByText("2 kg")).toBeDefined();
    expect(screen.getByText("1/38 entered")).toBeDefined();

    // A refresh: the component is thrown away and mounted again from scratch.
    cleanup();
    render(<ClosingScreen config={config} />);
    expect(screen.getByText("1/38 entered")).toBeDefined();

    // Which groups were open is view state, not part of the closing, so the
    // list comes back folded and the entry is under its group.
    await openGroup(user, "Fresh fruit");
    expect(screen.getByText("2 kg")).toBeDefined();
  });

  it("remembers which closing type was selected", async () => {
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);
    await weighApples(user);
    await user.click(screen.getByRole("tab", { name: "Weekly" }));

    cleanup();
    render(<ClosingScreen config={config} />);
    expect(
      screen.getByRole("tab", { name: "Weekly" }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("starts empty when nothing was saved", () => {
    render(<ClosingScreen config={config} />);
    expect(screen.getByText("0/38 entered")).toBeDefined();
  });
});

describe("a closing left over from another day", () => {
  function seedYesterday() {
    localStorage.setItem(
      STORAGE_KEY,
      serialiseSession({
        version: 1,
        tier: "daily",
        startedAt: "2020-01-02",
        entries: [
          {
            id: "old",
            kind: "weight",
            productId: "fresh-alma",
            raw: 2,
            containerId: "none",
            netGrams: 2000,
          },
        ],
      }),
    );
  }

  it("says so instead of quietly presenting stale numbers as today's", () => {
    seedYesterday();
    render(<ClosingScreen config={config} />);
    expect(screen.getByText(/started on 2 Jan 2020/)).toBeDefined();
  });

  it("clears it when the offer to start a new one is taken", async () => {
    seedYesterday();
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);

    await user.click(screen.getByRole("button", { name: "Start new" }));

    expect(screen.getByText("0/38 entered")).toBeDefined();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("starting a new closing on purpose", () => {
  it("asks before deleting the work", async () => {
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);
    await weighApples(user);

    await user.click(screen.getByRole("button", { name: "Start new closing" }));
    expect(screen.getByText("Delete all 1 entry?")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("1/38 entered")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Start new closing" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("0/38 entered")).toBeDefined();
  });

  it("is disabled while there is nothing to delete", () => {
    render(<ClosingScreen config={config} />);
    expect(
      screen
        .getByRole("button", { name: "Start new closing" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });
});

describe("switching closing type", () => {
  // Step 4's whole point: the right list for the right closing. Daily is a
  // subset of weekly, and monthly adds the categories the other two never
  // touch.
  it("shows each tier's own product list", async () => {
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);
    expect(screen.getByText("0/38 entered")).toBeDefined();

    await user.click(screen.getByRole("tab", { name: "Weekly" }));
    expect(screen.getByText("0/58 entered")).toBeDefined();

    await user.click(screen.getByRole("tab", { name: "Monthly" }));
    expect(screen.getByText("0/132 entered")).toBeDefined();
  });

  it("hides weekly-only products from the daily closing", async () => {
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);
    await openGroup(user, "Fresh fruit");
    expect(screen.queryByRole("button", { name: /^Cékla/ })).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Weekly" }));
    expect(screen.getByRole("button", { name: /^Cékla/ })).toBeDefined();
  });

  it("brings out the monthly-only groups only in the monthly closing", async () => {
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);
    expect(screen.queryByRole("button", { name: /Display case/ })).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Monthly" }));
    expect(screen.getByRole("button", { name: /Display case/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Coffee & sugar/ })).toBeDefined();
  });

  it("keeps entries made in another tier rather than discarding them", async () => {
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);

    await user.click(screen.getByRole("tab", { name: "Weekly" }));
    await weigh(user, "Cékla", "2");
    expect(screen.getByText("1/58 entered")).toBeDefined();

    // Cékla is not weighed daily, so it drops out of sight - but the entry is
    // still there when the weekly closing comes back.
    await user.click(screen.getByRole("tab", { name: "Daily" }));
    expect(screen.getByText("0/38 entered")).toBeDefined();
    expect(screen.queryByRole("button", { name: /^Cékla/ })).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Weekly" }));
    expect(screen.getByText("1/58 entered")).toBeDefined();
    expect(screen.getByText("2 kg")).toBeDefined();
  });
});

describe("the Missing filter", () => {
  it("hides what is already entered, so the list shrinks as work gets done", async () => {
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);
    await weighApples(user);

    await user.click(screen.getByRole("button", { name: /^Missing/ }));
    expect(screen.queryByRole("button", { name: /^Alma/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^Narancs/ })).toBeDefined();


    await user.click(screen.getByRole("button", { name: /^All/ }));
    expect(screen.getByRole("button", { name: /^Alma/ })).toBeDefined();
  });

  it("counts what is left to do", async () => {
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);
    // The count sits in its own span, so it reads as "Missing38", no space.
    const missing = () => screen.getByRole("button", { name: /^Missing/ });
    expect(missing().textContent).toBe("Missing38");

    await weighApples(user);
    expect(missing().textContent).toBe("Missing37");
  });

  it("says so when a whole group is finished, instead of an empty box", async () => {
    // Every frozen fruit weighed, nothing else touched.
    const frozenDaily = config.products.filter(
      (p) => p.group === "frozen" && p.tiers.includes("daily"),
    );
    localStorage.setItem(
      STORAGE_KEY,
      serialiseSession({
        version: 1,
        tier: "daily",
        startedAt: today(),
        entries: frozenDaily.map((p, i) => ({
          id: `e${i}`,
          kind: "weight",
          productId: p.id,
          raw: 1,
          containerId: "none",
          netGrams: 1000,
        })),
      }),
    );

    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);
    await user.click(screen.getByRole("button", { name: /^Missing/ }));
    await openGroup(user, "Frozen fruit");
    await openGroup(user, "Fresh fruit");

    expect(screen.getByText("Everything in this group is entered.")).toBeDefined();
    // The unfinished groups still list their products.
    expect(screen.getByRole("button", { name: /^Alma/ })).toBeDefined();
  });
});

describe("opening and closing a group", () => {
  it("starts every group closed, so the screen opens on the categories", () => {
    render(<ClosingScreen config={config} />);

    for (const label of ["Fresh fruit", "Frozen fruit", "Ice cream"]) {
      expect(
        screen
          .getByRole("button", { name: new RegExp(label) })
          .getAttribute("aria-expanded"),
      ).toBe("false");
    }
    expect(screen.queryByRole("button", { name: /^Alma/ })).toBeNull();
  });

  it("unfolds one group at a time, leaving the others closed", async () => {
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);
    const header = screen.getByRole("button", {
      name: /Fresh fruit & vegetables/,
    });

    await user.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: /^Alma/ })).toBeDefined();
    // Opening one does not open the rest.
    expect(screen.queryByRole("button", { name: /^Vanília/ })).toBeNull();

    await user.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: /^Alma/ })).toBeNull();
  });
});

describe("removing an entry", () => {
  it("takes it off the closing and out of storage", async () => {
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);
    await weighApples(user);
    expect(screen.getByText("1/38 entered")).toBeDefined();

    await user.click(screen.getByRole("button", { name: /^Remove / }));

    expect(screen.getByText("0/38 entered")).toBeDefined();
    expect(screen.queryByText("2 kg")).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toMatch(/"entries":\[\]/);
  });

  it("survives a refresh, like adding one does", async () => {
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);
    await weighApples(user);
    await weigh(user, "Narancs", "3");
    await user.click(screen.getByRole("button", { name: /^Remove No container · 2 kg/ }));

    cleanup();
    render(<ClosingScreen config={config} />);
    expect(screen.getByText("1/38 entered")).toBeDefined();

    await openGroup(user, "Fresh fruit");
    expect(screen.getByText("3 kg")).toBeDefined();
  });
});
