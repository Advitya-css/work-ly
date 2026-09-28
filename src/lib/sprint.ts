import "server-only";

import { pool } from "@/lib/db/pool";
import {
  DEFAULT_SPRINT_CAPACITY,
  SPRINT_CAPACITY_KEY,
  SPRINT_STATUS,
  parseSprintKey,
  sprintKey,
  spotsOpen,
  type SprintRow,
  type SprintStatus,
} from "@/lib/sprint-core";

/** See sprint-core.ts for how Sprints are stored. */

const FOREVER = "2100-01-01T00:00:00Z";

export interface SprintListItem extends SprintRow {
  key: string;
  email: string | null;
  name: string | null;
}

async function sprintRows(): Promise<{ key: string; row: SprintRow }[]> {
  const { rows } = await pool.query<{ key: string; count: number }>(
    `SELECT key, count FROM rate_limits WHERE key LIKE 'sprint:____-__-__:%'`,
  );
  return rows
    .map((r) => ({ key: r.key, row: parseSprintKey(r.key, Number(r.count)) }))
    .filter((r): r is { key: string; row: SprintRow } => r.row !== null);
}

export async function getSprintCapacity(): Promise<number> {
  try {
    const { rows } = await pool.query(`SELECT count FROM rate_limits WHERE key = $1`, [SPRINT_CAPACITY_KEY]);
    return rows[0] ? Math.max(0, Number(rows[0].count)) : DEFAULT_SPRINT_CAPACITY;
  } catch {
    return DEFAULT_SPRINT_CAPACITY;
  }
}

export async function setSprintCapacity(spots: number): Promise<void> {
  const n = Math.max(0, Math.min(20, Math.floor(spots)));
  await pool.query(
    `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET count = EXCLUDED.count`,
    [SPRINT_CAPACITY_KEY, n, FOREVER],
  );
}

/** Real open spots right now. On any error, 0 - never sell a spot that may not exist. */
export async function getSprintSpots(): Promise<{ capacity: number; open: number }> {
  try {
    const [capacity, rows] = await Promise.all([getSprintCapacity(), sprintRows()]);
    return { capacity, open: spotsOpen(capacity, rows.map((r) => r.row)) };
  } catch (error) {
    console.warn("[workly:sprint] couldn't count spots:", error instanceof Error ? error.message : error);
    return { capacity: 0, open: 0 };
  }
}

/** Records a paid Sprint. Idempotent: returns true only the first time. */
export async function recordSprintPaid(orderId: string, userId: string, paidAt: string): Promise<boolean> {
  const key = sprintKey(paidAt.slice(0, 10), orderId, userId);
  const { rowCount } = await pool.query(
    `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`,
    [key, SPRINT_STATUS.paid, FOREVER],
  );
  return (rowCount ?? 0) > 0;
}

/** The newest Sprint on this account, if any. */
export async function sprintForUser(userId: string): Promise<(SprintRow & { key: string }) | null> {
  const { rows } = await pool.query<{ key: string; count: number }>(
    `SELECT key, count FROM rate_limits WHERE key LIKE 'sprint:____-__-__:%' AND key LIKE $1`,
    [`%:${userId}`],
  );
  const parsed = rows
    .map((r) => {
      const row = parseSprintKey(r.key, Number(r.count));
      return row && row.userId === userId ? { ...row, key: r.key } : null;
    })
    .filter((r): r is SprintRow & { key: string } => r !== null)
    .sort((a, b) => b.day.localeCompare(a.day));
  return parsed[0] ?? null;
}

/** Moves a Sprint forward (never back). */
export async function setSprintStatus(key: string, status: SprintStatus): Promise<void> {
  await pool.query(`UPDATE rate_limits SET count = GREATEST(count, $2) WHERE key = $1 AND key LIKE 'sprint:%'`, [
    key,
    SPRINT_STATUS[status],
  ]);
}

/** Every Sprint with its buyer, newest first - for the admin page. */
export async function listSprints(): Promise<SprintListItem[]> {
  const rows = await sprintRows();
  if (rows.length === 0) return [];
  const ids = Array.from(new Set(rows.map((r) => r.row.userId)));
  const { rows: users } = await pool.query(`SELECT id, email, name FROM users WHERE id = ANY($1::text[])`, [ids]);
  const byId = new Map(users.map((u) => [String(u.id), u]));
  return rows
    .map(({ key, row }) => ({
      ...row,
      key,
      email: (byId.get(row.userId)?.email as string | undefined) ?? null,
      name: (byId.get(row.userId)?.name as string | undefined) ?? null,
    }))
    .sort((a, b) => b.day.localeCompare(a.day));
}
