/**
 * The cohort usage report as plain text, ready to paste into an email to
 * the program. Pure, so it can be tested.
 */
export interface SeatReportNumbers {
  group: string;
  seats: number;
  seatsUsed: number;
  activeLast14Days: number;
  checksRun: number;
  resumesTailored: number;
  proToolsUsed: number;
}

export function seatReportText(r: SeatReportNumbers, forWhom: string, asOf: Date): string {
  const day = asOf.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const pct = r.seats > 0 ? Math.round((r.seatsUsed / r.seats) * 100) : 0;
  return [
    `Work-ly usage report${forWhom ? ` for ${forWhom}` : ""}, as of ${day}`,
    "",
    `Seats in use: ${r.seatsUsed} of ${r.seats} (${pct}%)`,
    `Active in the last 14 days: ${r.activeLast14Days}`,
    `Job postings checked: ${r.checksRun}`,
    `Resumes tailored to a posting: ${r.resumesTailored}`,
    `Pro tools used in total: ${r.proToolsUsed}`,
    "",
    "These are totals across your group only. Each person's account, resume and results stay private to them.",
    `Code: ${r.group}`,
  ].join("\n");
}
