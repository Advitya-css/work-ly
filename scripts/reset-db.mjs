#!/usr/bin/env node
/**
 * Destroys and recreates the local development database.
 *
 *   npm run db:reset
 *
 * Only ever intended for local development - it refuses to run against a
 * host that isn't localhost, so a misconfigured .env can't drop a real
 * database by accident.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

function loadEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) {
    console.error(red("\n  ✗ No .env file found.\n"));
    process.exit(1);
  }
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnv();
  const url = new URL(process.env.DATABASE_URL);
  const dbName = url.pathname.replace(/^\//, "").split("?")[0];

  const localHosts = ["localhost", "127.0.0.1", "::1"];
  if (!localHosts.includes(url.hostname)) {
    console.error(red(`\n  ✗ Refusing to reset a non-local database (${url.hostname}).\n`));
    console.error("    This command only works against localhost, by design.\n");
    process.exit(1);
  }

  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  adminUrl.search = "";

  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();

  const quoted = dbName.replace(/"/g, '""');

  /**
   * A running `npm run dev` holds a connection pool open against this
   * database. Terminating those backends once isn't enough - the pool
   * reconnects immediately and races the DROP, so a single attempt can
   * fail or hang. Retry a few times: in practice the drop wins within one
   * or two rounds, and if it doesn't we tell the user exactly why rather
   * than hanging forever.
   */
  let dropped = false;
  for (let attempt = 1; attempt <= 5 && !dropped; attempt++) {
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName],
    );
    try {
      await admin.query(`DROP DATABASE IF EXISTS "${quoted}"`);
      dropped = true;
    } catch (error) {
      if (attempt === 5) {
        await admin.end();
        console.error(red(`\n  ✗ Couldn't drop the database. Something keeps reconnecting to it.\n`));
        console.error("    This is almost always a dev server still running.\n");
        console.error(green("    FIX: press Ctrl+C in the terminal running `npm run dev`,"));
        console.error(green("         then run this command again.\n"));
        console.error(dim(`    Underlying error: ${error.message}\n`));
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  console.log(green(`  ✓ Dropped database "${dbName}"`));
  await admin.end();

  console.log(green("\n  ✓ Reset complete.\n"));
  console.log("  Now rebuild it:\n");
  console.log(yellow("    npm run setup\n"));
}

main().catch((error) => {
  console.error(red(`\n  ✗ ${error.message}\n`));
  process.exit(1);
});
