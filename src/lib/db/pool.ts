import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

function createPool(): Pool {
  const pool = new Pool({
    connectionString: (() => {
      try {
        const urlStr = process.env.SUPABASE_POOLER_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || '';
        if (!urlStr) return '';
        const u = new URL(urlStr);
        u.searchParams.delete('sslmode');
        return u.toString();
      } catch (e) {
        return process.env.SUPABASE_POOLER_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || '';
      }
    })(),
    ssl: (process.env.SUPABASE_POOLER_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || '').includes('supabase') ? { rejectUnauthorized: false } : undefined,

    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    query_timeout: 15_000,
    statement_timeout: 15_000,
    max: 3,
  });

  pool.on("error", (error) => {
    console.error(`[workly:db] idle connection error.`, error);
  });

  return pool;
}

export const pool = globalForPg.pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

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
