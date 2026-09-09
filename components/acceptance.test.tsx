import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import ClosingScreen from "@/components/ClosingScreen";
import { getConfig } from "@/lib/config";
import { buildExportRows } from "@/lib/export";
import { STORAGE_KEY } from "@/lib/session";
import { resetStoreForTests } from "@/lib/session-store";
import type { StoredSession } from "@/lib/session";

/**
 * Phase 1's exit criteria, exercised the way a closing actually happens: every
 * number below is entered through the real UI — no state is injected — and the
 * expected results are worked out by hand, the way staff do it today.
 */

const config = getConfig();

afterEach(() => {
  cleanup();
  resetStoreForTests();
  localStorage.clear();
});

function storedSession(): StoredSession {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error("nothing was saved");
  return JSON.parse(raw) as StoredSession;
}

async function openGroup(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
  const heading = screen
    .getAllByRole("button")
    .find((b) => label.test(b.textContent ?? ""));
  if (!heading) throw new Error(`no group ${label}`);
  if (heading.getAttribute("aria-expanded") === "false") await user.click(heading);
}

async function openProduct(user: ReturnType<typeof userEvent.setup>, name: string) {
  const row = screen
    .getAllByRole("button")
    .find((b) => (b.textContent ?? "").trim().startsWith(name));
  if (!row) throw new Error(`no product row for ${name}`);
  await user.click(row);
  return row;
}

async function weigh(
  user: ReturnType<typeof userEvent.setup>,
  { product, group, raw, containerGroup, size, variant }: {
    product: string;
    group: RegExp;
    raw: string;
    containerGroup?: string;
    size?: RegExp;
    variant?: RegExp;
  },
) {
  await openGroup(user, group);
  const row = await openProduct(user, product);

  if (containerGroup) {
    await user.click(screen.getByRole("button", { name: new RegExp(`^${containerGroup}$`) }));
  }
  if (size) await user.click(screen.getByRole("button", { name: size }));
  if (variant) await user.click(screen.getByRole("button", { name: variant }));

  await user.type(screen.getByLabelText(/Raw weight/), raw);
  await user.click(screen.getByRole("button", { name: "Add to closing" }));
  await user.click(row); // collapse, as staff would move on
}

describe("a realistic daily closing, entered through the UI", () => {
  it("produces the numbers a calculator would, and exports them", async () => {
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);

    // Oranges, weighed twice: one tray peeled, one tray whole.
    // Peeled: (2340 − 276 tare) × 1.35 = 2786.4 → 2786 g
    // Whole:  (5000 − 378 tare) × 1     = 4622 g
    // Total:  7408 g = 7.408 kg
    await weigh(user, {
      product: "Narancs", group: /Fresh fruit/, raw: "2,34",
      containerGroup: "Metal", size: /S 276 g/, variant: /^Peeled/,
    });
    await weigh(user, {
      product: "Narancs", group: /Fresh fruit/, raw: "5",
      containerGroup: "Metal", size: /M 378 g/, variant: /^Whole/,
    });

    // Apples in a large plastic tray: 1500 − 393 = 1107 g
    await weigh(user, {
      product: "Alma", group: /Fresh fruit/, raw: "1.5",
      containerGroup: "Plastic", size: /Large 393 g/,
    });

    // Watermelon, peeled, in the deco basket: (3000 − 600) × 1.4 = 3360 g
    await weigh(user, {
      product: "Görögdinnye", group: /Fresh fruit/, raw: "3",
      containerGroup: "Deco", variant: /^Peeled/,
    });

    // Vanilla ice cream: the tray is preselected, so 1200 − 750 = 450 g
    await weigh(user, {
      product: "Vanília", group: /Ice cream/, raw: "1200",
    });

    // Frozen blueberries straight on the scale: 3200 g
    await weigh(user, {
      product: "Áfonya", group: /Frozen fruit/, raw: "3,2", containerGroup: "None",
    });

    const session = storedSession();
    expect(session.entries).toHaveLength(6);

    // What the app says on screen.
    expect(screen.getByText("5/38 entered")).toBeDefined();

    // What the report will say — every figure hand-checked above.
    const rows = buildExportRows(config, "daily", session.startedAt, session.entries);
    const value = (name: string) =>
      rows.find((r) => r[0]?.value === name)?.[1]?.value;

    expect(value("Narancs")).toBe(7.408);
    expect(value("Alma")).toBe(1.107);
    expect(value("Görögdinnye")).toBe(3.36);
    expect(value("Vanília")).toBe(450);
    expect(value("Áfonya")).toBe(3.2);

    // The multi-form product shows how its total was made up.
    const narancs = rows.find((r) => r[0]?.value === "Narancs");
    expect(narancs?.[3]?.value).toBe("Peeled · 2.786 kg + Whole · 4.622 kg");

    // And nothing is silently missing.
    expect(
      rows.some((r) => String(r[0]?.value ?? "").startsWith("Not entered (33)")),
    ).toBe(true);
  }, 30000);
});

describe("a weekly closing adds the counted accessories", () => {
  it("turns boxes and packs into a piece count", async () => {
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);
    await user.click(screen.getByRole("tab", { name: "Weekly" }));

    await openGroup(user, /Packaging/);
    await openProduct(user, "Pohár 0,3");

    // 2 karton (800) + 3 csomag (50) + 4 loose = 1600 + 150 + 4 = 1754
    for (let i = 0; i < 2; i++)
      await user.click(screen.getByRole("button", { name: "More karton" }));
    for (let i = 0; i < 3; i++)
      await user.click(screen.getByRole("button", { name: "More csomag" }));
    for (let i = 0; i < 4; i++)
      await user.click(screen.getByRole("button", { name: "More Loose pieces" }));

    expect(screen.getByText(/Total 1754 db/)).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Add to closing" }));

    const session = storedSession();
    const rows = buildExportRows(config, "weekly", session.startedAt, session.entries);
    const cups = rows.find((r) => r[0]?.value === "Pohár 0,3");
    expect(cups?.[1]?.value).toBe(1754);
    expect(cups?.[2]?.value).toBe("db");
  }, 30000);
});

describe("correcting a mistake mid-closing", () => {
  it("removes a wrong entry and leaves the rest of the closing intact", async () => {
    const user = userEvent.setup();
    render(<ClosingScreen config={config} />);

    await weigh(user, {
      product: "Alma", group: /Fresh fruit/, raw: "1.5",
      containerGroup: "Plastic", size: /Large 393 g/,
    });
    // Wrong tray picked: entered against Körte by mistake.
    await weigh(user, {
      product: "Körte", group: /Fresh fruit/, raw: "9",
      containerGroup: "None",
    });
    expect(screen.getByText("2/38 entered")).toBeDefined();

    const korte = await openProduct(user, "Körte");
    const korteRow = korte.closest("li")!;
    await user.click(
      within(korteRow).getByRole("button", { name: /^Remove/ }),
    );

    expect(screen.getByText("1/38 entered")).toBeDefined();
    const session = storedSession();
    expect(session.entries).toHaveLength(1);
    expect(session.entries[0]!.productId).toBe("fresh-alma");
  }, 30000);
});
