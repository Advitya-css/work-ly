import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const noop = fileURLToPath(new URL("./tests/setup/no-op-module.ts", import.meta.url));

/**
 * Unit and integration tests.
 *
 * `tsconfigPaths` makes the `@/` alias resolve exactly as it does in the
 * app, so tests import the real modules rather than copies — a test that
 * imports a reimplementation proves nothing about shipped code.
 *
 * Database tests are opt-in via WORKLY_TEST_DB=1 so `npm test` stays fast
 * and runnable with no Postgres; `npm run test:db` turns them on.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // Server modules are marked with `import "server-only"`, which throws
      // outside a React Server Component. Tests run in plain Node, so point
      // both marker packages at their no-op build — the same thing Next does
      // for the server graph. Without this every scoring/db import fails at
      // collection time.
      "server-only": noop,
      "client-only": noop,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup/load-env.ts"],
    // Discovery/db tests touch a shared database; running files in parallel
    // would let them delete each other's fixtures mid-assertion.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
