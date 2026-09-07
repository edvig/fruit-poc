import { afterEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEY } from "@/lib/session";
import {
  getServerSnapshot,
  getSnapshot,
  resetStoreForTests,
  subscribe,
  write,
} from "@/lib/session-store";

afterEach(() => {
  resetStoreForTests();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("reading and writing", () => {
  it("round trips through localStorage", () => {
    write('{"hello":"world"}');
    expect(getSnapshot()).toBe('{"hello":"world"}');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"hello":"world"}');
  });

  it("clears the closing when written null", () => {
    write("something");
    write(null);
    expect(getSnapshot()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("has nothing to show on the server, so the first render matches", () => {
    expect(getServerSnapshot()).toBeNull();
  });

  it("notifies subscribers so React re-renders", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    write("a");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    write("b");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("a browser that refuses storage (Safari private mode)", () => {
  it("keeps the closing in memory instead of dropping every entry", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    write('{"entries":[1]}');
    // The write failed, but the closing is still readable for this session.
    expect(getSnapshot()).toBe('{"entries":[1]}');
  });

  it("reads as empty when storage cannot be read at all", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(getSnapshot()).toBeNull();
  });
});
