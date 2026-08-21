#!/usr/bin/env node
/**
 * One-command database setup for local development.
 *
 *   npm run setup
 *
 * Creates the database if it doesn't exist, then applies every SQL file in
 * prisma/migrations/ in date order, recording what it applied so re-running
 * is always safe.
 *
 * Deliberately uses the `pg` package rather than shelling out to `psql`:
 * the most common Mac Postgres installer (Postgres.app) does not put `psql`
 * on your PATH, so a psql-based script fails for exactly the people who
 * most need this to just work.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(ROOT, "prisma", "migrations");

// --- Colours, so the important lines stand out in a beginner's terminal ---
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

function loadEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) {
    console.error(red("\n  ✗ No .env file found.\n"));
    console.error("    Copy the example file first:\n");
    console.error(yellow("      cp .env.example .env\n"));
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

function fail(message, hint) {
  console.error(red(`\n  ✗ ${message}\n`));
  if (hint) console.error(`${hint}\n`);
  process.exit(1);
}

async function main() {
  loadEnv();

  const url = process.env.DATABASE_URL;
  if (!url) fail("DATABASE_URL is not set in .env");

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    fail(`DATABASE_URL doesn't look like a valid connection string:\n    ${url}`);
  }

  const dbName = parsed.pathname.replace(/^\//, "").split("?")[0] || "workly_dev";

  // --- Step 1: connect to the maintenance DB and create ours if needed ---
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  adminUrl.search = "";

  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  try {
    await admin.connect();
  } catch (error) {
    fail(
      `Couldn't reach PostgreSQL at ${parsed.host}.`,
      [
        "    Is PostgreSQL running?",
        "",
        "    If you installed Postgres.app, open it and make sure it says",
        `    ${green("Running")} with a green light. If it says "Initialize", click that first.`,
        "",
        dim(`    Underlying error: ${error.message}`),
      ].join("\n"),
    );
  }

  const { rows } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (rows.length === 0) {
    // Identifier can't be parameterised; dbName comes from the developer's
    // own .env, and we quote it to keep it a single identifier regardless.
    await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(green(`  ✓ Created database "${dbName}"`));
  } else {
    console.log(dim(`  · Database "${dbName}" already exists`));
  }
  await admin.end();

  // --- Step 2: apply migrations in order, skipping ones already applied ---
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS _workly_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const applied = new Set(
    (await client.query("SELECT name FROM _workly_migrations")).rows.map((r) => r.name),
  );

  // --- Pre-flight: is this database half-built? --------------------------
  // A database with Workly tables in it but nothing recorded in
  // _workly_migrations was created some other way (an older manual
  // `psql -f`, or a partly-failed run). Applying migration 1 to it fails
  // deep inside with a confusing "type X already exists", so catch it here
  // and say plainly what to do instead.
  const { rows: existingTables } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_workly_migrations'`,
  );
  if (existingTables.length > 0 && applied.size === 0) {
    await client.end();
    console.error(red("\n  ✗ This database is in a half-built state.\n"));
    console.error(
      [
        `    It already contains ${existingTables.length} table(s), but none of them were`,
        "    created by this setup script, so it can't safely continue.",
        "",
        `    Tables found: ${existingTables.map((t) => t.tablename).sort().join(", ")}`,
        "",
        green("    FIX: copy and run these two commands, in this order:"),
        "",
        yellow("      npm run db:reset"),
        yellow("      npm run setup"),
        "",
        "    The first wipes the database, the second rebuilds it properly.",
        "    You will lose any test data you entered, which is normally fine.",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  const migrations = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  let ran = 0;
  for (const name of migrations) {
    if (applied.has(name)) {
      console.log(dim(`  · ${name} (already applied)`));
      continue;
    }
    const sqlPath = join(MIGRATIONS_DIR, name, "migration.sql");
    if (!existsSync(sqlPath)) continue;

    const sql = readFileSync(sqlPath, "utf8");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _workly_migrations (name) VALUES ($1)", [name]);
      await client.query("COMMIT");
      console.log(green(`  ✓ Applied ${name}`));
      ran++;
    } catch (error) {
      await client.query("ROLLBACK");
      await client.end();
      fail(
        `Migration ${name} failed.`,
        [
          "    Nothing was changed. The migration was rolled back.",
          "",
          "    The usual cause is a database left half-set-up by an earlier attempt.",
          "    To start completely fresh, run this and then try again:",
          "",
          yellow(`      npm run db:reset`),
          "",
          dim(`    Underlying error: ${error.message}`),
        ].join("\n"),
      );
    }
  }

  await client.end();

  console.log(
    ran === 0
      ? green("\n  ✓ Database already up to date.\n")
      : green(`\n  ✓ Database ready. Applied ${ran} migration${ran === 1 ? "" : "s"}.\n`),
  );
  console.log(`  Next, start the app:\n`);
  console.log(yellow("    npm run dev\n"));
}

main().catch((error) => {
  console.error(red(`\n  ✗ Unexpected error: ${error.message}\n`));
  process.exit(1);
});
