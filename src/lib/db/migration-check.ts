import "server-only";

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { pool } from "./pool";

/**
 * IS THE DATABASE UP TO DATE WITH THE CODE?
 *
 * This exists because of a specific, avoidable failure. A migration added
 * columns for student mode. The code shipped, the migration did not get
 * applied, and the first person to press "Student? Click here" got
 *
 *     column "isStudent" of relation "career_profiles" does not exist
 *
 * on screen, from a crashed page. Three things were wrong with that: a raw
 * Postgres error reached a user, the app discovered the problem at the
 * moment of use rather than at boot, and nothing anywhere told them the one
 * command that fixes it.
 *
 * So the check runs once at startup and compares the migration folders on
 * disk against the rows in _workly_migrations. If the database is behind it
 * says so, by name, with the command. It never throws: a database that is
 * merely behind should still boot, because refusing to start would take
 * away the very screens someone might need to read the message on.
 */

export interface MigrationStatus {
  applied: string[];
  pending: string[];
  /** Set when the check itself could not run, e.g. the database is unreachable. */
  unavailable?: string;
}

function migrationsOnDisk(): string[] {
  const dir = join(process.cwd(), "prisma", "migrations");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export async function checkMigrations(): Promise<MigrationStatus> {
  const onDisk = migrationsOnDisk();
  if (onDisk.length === 0) return { applied: [], pending: [] };

  try {
    const { rows } = await pool.query<{ name: string }>(
      `SELECT name FROM _workly_migrations`,
    );
    const applied = new Set(rows.map((r) => r.name));
    return {
      applied: onDisk.filter((m) => applied.has(m)),
      pending: onDisk.filter((m) => !applied.has(m)),
    };
  } catch (error) {
    // A missing _workly_migrations table means setup has never been run at
    // all, which is a pending state, not an error worth shouting about
    // differently.
    const message = error instanceof Error ? error.message : String(error);
    if (/relation "_workly_migrations" does not exist/i.test(message)) {
      return { applied: [], pending: onDisk };
    }
    return { applied: [], pending: [], unavailable: message };
  }
}

/**
 * Called at startup. Warns and returns; never throws.
 *
 * Loud on purpose. The failure this prevents is silent until someone clicks
 * the one feature that needs the new column, which can be days later.
 */
export async function warnIfMigrationsPending(): Promise<void> {
  const status = await checkMigrations();

  if (status.unavailable) {
    console.warn(
      `[workly:db] Could not check migrations: ${status.unavailable}\n` +
        `            If the app misbehaves, check PostgreSQL is running.`,
    );
    return;
  }

  if (status.pending.length === 0) return;

  const list = status.pending.map((m) => `              - ${m}`).join("\n");
  console.warn(
    `\n[workly:db] YOUR DATABASE IS BEHIND THE APP.\n` +
      `            ${status.pending.length} migration(s) have not been applied:\n${list}\n\n` +
      `            Features using them will fail until you run:\n\n` +
      `              npm run setup\n\n` +
      `            That applies only what is missing and leaves your data alone.\n`,
  );
}
