import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Component tests need a DOM; the pure lib tests run fine in it too.
    environment: "jsdom",
  },
  resolve: {
    // Mirrors the "@/*" path alias in tsconfig.json.
    alias: { "@": import.meta.dirname },
  },
});
