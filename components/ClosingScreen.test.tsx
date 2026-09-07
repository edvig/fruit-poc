import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import ClosingScreen from "@/components/ClosingScreen";
import { getConfig } from "@/lib/config";
import { STORAGE_KEY, serialiseSession } from "@/lib/session";
import { resetStoreForTests } from "@/lib/session-store";

const config = getConfig();

afterEach(() => {
  cleanup();
  resetStoreForTests();
  localStorage.clear();
});

/** Weighs 2 kg of apples with no container, the shortest real entry there is. */
async function weighApples(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^Alma/ }));
  await user.type(screen.getByLabelText(/Raw weight/), "2");
  await user.click(screen.getByRole("button", { name: "Add to closing" }));
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

    expect(screen.getByText("2 kg")).toBeDefined();
    expect(screen.getByText("1/38 entered")).toBeDefined();
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
