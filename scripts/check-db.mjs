#!/usr/bin/env node
/**
 * Diagnoses the local database.
 *
 *   npm run db:check
 *
 * Prints which tables exist, which migrations are recorded, and whether the
 * two agree - then says in plain language whether the app will run. Exists
 * because "relation X does not exist" at runtime tells you something is
 * wrong but not what, and the fix depends entirely on which of several
 * states the database is actually in.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(ROOT, "prisma", "migrations");

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

function loadEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) {
    console.error(red("\n  ✗ No .env file found. Run: cp .env.example .env\n"));
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

/**
 * Expected tables are derived from the migration files actually present on
 * disk, not from a hardcoded list. A hardcoded list goes stale the moment
 * a folder is a phase behind or ahead, and then reports tables as
 * "missing" that the user has no migration for - which sends them chasing
 * a problem that doesn't exist.
 */
function expectedTables() {
  const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const expected = [];
  for (const dir of dirs) {
    const sqlPath = join(MIGRATIONS_DIR, dir, "migration.sql");
    if (!existsSync(sqlPath)) continue;
    const sql = readFileSync(sqlPath, "utf8");
    for (const match of sql.matchAll(/CREATE TABLE\s+"([^"]+)"/gi)) {
      expected.push([match[1], dir]);
    }
  }
  return expected;
}

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(red("\n  ✗ DATABASE_URL is not set in .env\n"));
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
  } catch (error) {
    console.error(red("\n  ✗ Can't connect to PostgreSQL.\n"));
    console.error("    Is the Postgres app running? Open it and look for a green light.\n");
    console.error(dim(`    ${error.message}\n`));
    process.exit(1);
  }

  const { rows: tableRows } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const present = new Set(tableRows.map((r) => r.tablename));

  let recorded = [];
  if (present.has("_workly_migrations")) {
    recorded = (await client.query("SELECT name FROM _workly_migrations ORDER BY name")).rows.map(
      (r) => r.name,
    );
  }

  const onDisk = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  console.log("\n  TABLES");
  const missing = [];
  for (const [table, fromMigration] of expectedTables()) {
    const ok = present.has(table);
    if (!ok) missing.push([table, fromMigration]);
    console.log(`    ${ok ? green("✓") : red("✗")} ${table.padEnd(22)} ${dim(fromMigration)}`);
  }

  console.log("\n  MIGRATIONS");
  for (const name of onDisk) {
    const ok = recorded.includes(name);
    console.log(`    ${ok ? green("✓ applied") : red("✗ missing ")} ${name}`);
  }

  console.log("\n  VERDICT");
  if (missing.length === 0 && recorded.length === onDisk.length) {
    console.log(green("    ✓ Database is complete and up to date. The app should run.\n"));
    await client.end();
    return;
  }

  if (present.size > 0 && recorded.length === 0) {
    console.log(red("    ✗ Half-built: tables exist but no migrations are recorded."));
    console.log("      This database was created outside the setup script.\n");
    console.log(green("      FIX: stop the dev server (Ctrl+C), then run:\n"));
    console.log(yellow("        npm run db:rebuild\n"));
  } else if (missing.length > 0) {
    console.log(red(`    ✗ ${missing.length} table(s) missing.`));
    console.log(`      Missing: ${missing.map(([t]) => t).join(", ")}\n`);
    console.log(green("      FIX: try this first:\n"));
    console.log(yellow("        npm run setup\n"));
    console.log("      If that errors, stop the dev server (Ctrl+C) and do a clean rebuild:\n");
    console.log(yellow("        npm run db:rebuild\n"));
  } else {
    console.log(yellow("    ! Migrations on disk aren't all recorded. Run: npm run setup\n"));
  }

  await client.end();
  process.exit(1);
}

main().catch((error) => {
  console.error(red(`\n  ✗ ${error.message}\n`));
  process.exit(1);
});
