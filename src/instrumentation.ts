/**
 * Next.js runs this once when the server starts, before any request is
 * handled. That's the right moment to validate configuration: a
 * misconfigured deploy should fail at boot with a readable message, not at
 * the first user request with a stack trace.
 */
export async function register() {
  // Guarded because instrumentation also runs in the edge runtime, where
  // server-only modules aren't available.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnvironment } = await import("@/lib/env");
    assertEnvironment();

    // Schema drift is checked separately and never blocks boot: a database
    // that is merely behind should still start, so the instructions can be
    // read on a working screen. See lib/db/migration-check.ts.
    const { warnIfMigrationsPending } = await import("@/lib/db/migration-check");
    await warnIfMigrationsPending().catch(() => {
      // Startup diagnostics must never be the reason the app won't start.
    });
  }
}
