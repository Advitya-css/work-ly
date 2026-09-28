/**
 * THE $10,000 PLAN - the weekly targets from "Work-ly: $10,000 by 31
 * December", so the admin page can say every day whether we're on plan.
 * Cumulative US dollars banked (paid, after refunds) by the end of each
 * week, from 28 September 2026.
 */

export const PLAN_START = "2026-09-28";
export const PLAN_GOAL_USD = 10_000;
export const PLAN_END = "2026-12-31";
/** The make-or-break checkpoint. */
export const PLAN_CHECKPOINT = { day: "2026-11-30", usd: 4_400 };

export const WEEKLY_TARGETS: { week: number; ends: string; usd: number; job: string }[] = [
  { week: 1, ends: "2026-10-04", usd: 50, job: "Build and launch" },
  { week: 2, ends: "2026-10-11", usd: 300, job: "Open every channel" },
  { week: 3, ends: "2026-10-18", usd: 600, job: "First Sprint" },
  { week: 4, ends: "2026-10-25", usd: 1_000, job: "Launch week" },
  { week: 5, ends: "2026-11-01", usd: 1_450, job: "October close" },
  { week: 6, ends: "2026-11-08", usd: 2_000, job: "Pilots" },
  { week: 7, ends: "2026-11-15", usd: 2_700, job: "First pilot" },
  { week: 8, ends: "2026-11-22", usd: 3_200, job: "Last outreach" },
  { week: 9, ends: "2026-11-29", usd: 4_000, job: "Black Friday" },
  { week: 10, ends: "2026-12-06", usd: 4_700, job: "Checkpoint" },
  { week: 11, ends: "2026-12-13", usd: 7_500, job: "Licence" },
  { week: 12, ends: "2026-12-20", usd: 8_300, job: "Year-end budgets" },
  { week: 13, ends: "2026-12-27", usd: 9_100, job: "New Year push" },
  { week: 14, ends: "2026-12-31", usd: 10_235, job: "Close" },
];

export interface PlanStatus {
  bankedUsd: number;
  goalPct: number;
  /** The week we're in (the last one after the plan ends; null before it starts). */
  week: (typeof WEEKLY_TARGETS)[number] | null;
  /** Where the plan says we should be today, pro rata inside the week. */
  targetTodayUsd: number;
  /** banked - target today: positive = ahead. */
  aheadUsd: number;
  daysLeft: number;
}

const DAY = 86_400_000;
const at = (day: string) => Date.parse(`${day}T23:59:59Z`);

export function planStatus(bankedCents: number, now = new Date()): PlanStatus {
  const bankedUsd = Math.round(bankedCents) / 100;
  const t = now.getTime();
  const idx = WEEKLY_TARGETS.findIndex((w) => t <= at(w.ends));
  const week = t < Date.parse(`${PLAN_START}T00:00:00Z`) ? null : (WEEKLY_TARGETS.at(idx === -1 ? -1 : idx) ?? null);

  let targetTodayUsd = 0;
  if (week) {
    const prev = week.week > 1 ? WEEKLY_TARGETS[week.week - 2] : null;
    const from = prev ? at(prev.ends) : Date.parse(`${PLAN_START}T00:00:00Z`);
    const span = Math.max(1, at(week.ends) - from);
    const frac = Math.min(1, Math.max(0, (t - from) / span));
    const base = prev?.usd ?? 0;
    targetTodayUsd = Math.round(base + (week.usd - base) * frac);
  }
  return {
    bankedUsd,
    goalPct: Math.min(100, Math.round((bankedUsd / PLAN_GOAL_USD) * 1000) / 10),
    week,
    targetTodayUsd,
    aheadUsd: Math.round(bankedUsd - targetTodayUsd),
    daysLeft: Math.max(0, Math.ceil((at(PLAN_END) - t) / DAY)),
  };
}
