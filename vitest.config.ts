import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests run in Node against the pure logic in lib/. The "@/" alias
// mirrors tsconfig so tests import modules the same way the app does.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` throws outside a Server Component; stub it for tests.
      "server-only": path.resolve(__dirname, "test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
