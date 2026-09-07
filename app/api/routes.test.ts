import { describe, expect, it } from "vitest";

import { GET as configRoute } from "@/app/api/config/route";
import { GET as healthRoute } from "@/app/api/health/route";
import { getConfig, type AppConfig } from "@/lib/config";

describe("GET /api/health", () => {
  it("answers ok, which is all the deploy check looks for", async () => {
    const response = healthRoute();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});

describe("GET /api/config", () => {
  async function body(): Promise<AppConfig> {
    return (await configRoute().json()) as AppConfig;
  }

  it("serves the whole config the client needs for a closing", async () => {
    const served = await body();
    const local = getConfig();

    expect(served.products).toHaveLength(local.products.length);
    expect(served.groups).toHaveLength(local.groups.length);
    expect(served.containers).toHaveLength(local.containers.length);
  });

  // Everything after load is computed in the browser from this payload, so
  // anything lost in JSON.stringify is a wrong number at the register.
  it("survives the trip through JSON unchanged", async () => {
    expect(await body()).toEqual(JSON.parse(JSON.stringify(getConfig())));
  });

  it("carries the pieces the entry flow depends on", async () => {
    const served = await body();
    const icecream = served.groups.find((g) => g.id === "icecream");
    const narancs = served.products.find((p) => p.id === "fresh-narancs");
    const pohar = served.products.find((p) => p.id === "acc-pohar-0-3");

    expect(icecream?.defaultContainer).toBe("metal-icecream-tray");
    expect(narancs?.variants?.map((v) => v.multiplier)).toEqual([1, 1.35]);
    expect(pohar?.packs?.[0]).toMatchObject({ id: "karton", pieces: 800 });
    expect(served.containers.find((c) => c.id === "metal-small")?.tare).toBe(276);
  });

  it("is json", async () => {
    expect(configRoute().headers.get("content-type")).toMatch(/application\/json/);
  });
});
