import { Pool } from "pg";

/**
 * Raw Postgres connection pool, shared as a singleton across hot reloads.
 *
 * Why this exists instead of the generated Prisma Client: `prisma/schema.prisma`
 * is the source of truth for the data model, but generating the type-safe
 * Prisma Client requires `npx prisma generate`, which downloads a schema
 * engine binary from Prisma's CDN. That download is unreachable from this
 * project's current sandbox network policy, so this thin, hand-typed query
 * layer (see the sibling files in this folder) stands in for it.
 *
 * On a normal machine, `npm install` runs `prisma generate` automatically
 * (see the "postinstall" script in package.json) and `src/lib/db/prisma.ts`
 * becomes usable - swap call sites over to it when convenient. Nothing
 * about the schema or migrations needs to change either way.
 *
 * ---------------------------------------------------------------------------
 * TIMEOUTS ARE NOT OPTIONAL HERE
 * ---------------------------------------------------------------------------
 * `pg.Pool` defaults to waiting FOREVER for a connection. Combined with the
 * hot-reload singleton above, that produced a genuinely undebuggable
 * failure: run `npm run db:rebuild` while `npm run dev` is running, and the
 * cached pool keeps handing out connections to a database that no longer
 * exists. Every server component then awaits a promise that never settles,
 * so the page renders nothing at all - a blank white screen with Next.js
 * stuck on "Rendering …", no error, no stack trace, nothing in the
 * terminal.
 *
 * Every timeout below exists to turn that silent hang into a fast, legible
 * error. A visible error message is always better than a spinner that never
 * resolves, even when the underlying problem is identical.
 */
const globalForPg = globalThis as unknown as { pgPool?: Pool };

function createPool(): Pool {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL,

    /** Give up acquiring a connection rather than queueing indefinitely. */
    connectionTimeoutMillis: 5_000,

    /**
     * Retire idle connections quickly. After a database is dropped and
     * recreated, stale sockets in the pool are unusable; a short idle
     * timeout means they're discarded instead of handed to the next query.
     */
    idleTimeoutMillis: 10_000,

    /** Client-side cap so one wedged query can't hold a page hostage. */
    query_timeout: 15_000,

    /** Server-side equivalent, in case the socket itself is the problem. */
    statement_timeout: 15_000,

    max: 10,
  });

  /**
   * Without this handler, an error on an IDLE client (exactly what a
   * dropped database causes) is emitted as an unhandled 'error' event.
   * Node's default behaviour for that is to crash the process - and in the
   * Next.js dev server it instead leaves the request hanging. Handling it
   * lets pg evict the dead client and carry on.
   */
  pool.on("error", (error) => {
    console.error(
      `[workly:db] idle connection error. The client was discarded and the pool will reconnect. ` +
        `If this repeats, the database may have been reset while the dev server was running; ` +
        `stop it with Ctrl+C and run \`npm run dev\` again. (${error.message})`,
    );
  });

  return pool;
}

export const pool = globalForPg.pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

/**
 * Wraps the raw driver error in something a human can act on. The pg
 * messages for these three cases ("ECONNREFUSED", "does not exist",
 * "timeout exceeded") are accurate but give no indication of what to
 * actually do, and this project is run by someone who shouldn't have to
 * know pg's error vocabulary to get unstuck.
 */
export function explainDbError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/ECONNREFUSED|ENOTFOUND|Connection terminated/i.test(message)) {
    return "Can't reach PostgreSQL. Open the Postgres app and check it shows a green light, then reload.";
  }
  if (/database .* does not exist/i.test(message)) {
    return "The database doesn't exist yet. Stop the dev server (Ctrl+C) and run: npm run db:rebuild";
  }
  if (/relation .* does not exist/i.test(message)) {
    return "The database is missing tables. Stop the dev server (Ctrl+C) and run: npm run db:rebuild";
  }
  if (/timeout exceeded|Query read timeout/i.test(message)) {
    return "The database stopped responding. This usually means it was reset while the app was running. Stop the dev server (Ctrl+C) and run: npm run dev";
  }
  return message;
}
