/**
 * THE APPLICATION SPRINT - pure parts, so they can be tested.
 *
 * Each paid Sprint is one rate_limits row that never expires:
 *   sprint:<YYYY-MM-DD>:<orderId>:<userId>   count = status
 * and the number of Sprints the founder can run at once is
 *   sprint:capacity                           count = spots
 *
 * A Sprint is "running" from the day it's paid until it's marked
 * delivered, or 21 days pass (14 days of work plus slack). Open spots are
 * the capacity minus the Sprints running - always the real number, never
 * a made-up "only 2 left".
 */

export const SPRINT_DAYS = 14;
export const DEFAULT_SPRINT_CAPACITY = 4;
export const SPRINT_CAPACITY_KEY = "sprint:capacity";

export const SPRINT_STATUS = {
  paid: 1,
  intake: 2,
  delivered: 3,
} as const;

export type SprintStatus = keyof typeof SPRINT_STATUS;

export interface SprintRow {
  day: string;
  orderId: string;
  userId: string;
  status: SprintStatus;
}

export function sprintKey(day: string, orderId: string, userId: string): string {
  return `sprint:${day}:${orderId}:${userId}`;
}

export function statusFromCount(count: number): SprintStatus {
  if (count >= SPRINT_STATUS.delivered) return "delivered";
  if (count >= SPRINT_STATUS.intake) return "intake";
  return "paid";
}

export function parseSprintKey(key: string, count: number): SprintRow | null {
  const m = /^sprint:(\d{4}-\d{2}-\d{2}):([^:]+):([^:]+)$/.exec(key);
  if (!m) return null;
  return { day: m[1], orderId: m[2], userId: m[3], status: statusFromCount(count) };
}

/** Still taking up a spot: not delivered and paid within the last 21 days. */
export function isRunning(row: SprintRow, now = new Date()): boolean {
  if (row.status === "delivered") return false;
  const paid = Date.parse(`${row.day}T00:00:00Z`);
  return Number.isFinite(paid) && now.getTime() - paid < (SPRINT_DAYS + 7) * 86_400_000;
}

export function spotsOpen(capacity: number, rows: SprintRow[], now = new Date()): number {
  const running = rows.filter((r) => isRunning(r, now)).length;
  return Math.max(0, Math.floor(capacity) - running);
}

export const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  paid: "Paid, waiting for intake",
  intake: "Intake in, in progress",
  delivered: "Delivered",
};

/** Up to 5 posting links from free text: one per line, http(s) only. */
export function postingLinks(text: string): string[] {
  const links = text
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\/[^\s]+\.[^\s]+/i.test(s));
  return Array.from(new Set(links)).slice(0, 5);
}
