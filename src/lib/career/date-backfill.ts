/**
 * FILLING IN ROLE DATES THE PARSER MISSED - pure, so it can be tested.
 *
 * The AI extraction sometimes returns a role's start date but drops its end
 * date and the "Present" flag (seen live: "Data Analyst | QuickBite |
 * Mar 2023 - Present" came back as starting Mar 2023 with no end, so the
 * tailored resume printed "Mar 2023" alone and every current role looked
 * like a past one). The built-in fallback parser reads no dates at all.
 *
 * This reads the date range printed on the role's own line in the resume
 * and fills in only what's missing. It never changes a date the parser did
 * return, and it never adds a month the resume doesn't state.
 */

export interface DatedRole {
  company?: string | null;
  title?: string | null;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const MONTH_WORD = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const POINT = `(?:${MONTH_WORD}\\.?\\s+\\d{4}|\\d{1,2}\\/\\d{4}|\\d{4})`;
const NOW = "(?:present|current|now|till date|to date|ongoing)";
const RANGE = new RegExp(`(${POINT})\\s*(?:-|–|—|to|until)\\s*(${POINT}|${NOW})`, "i");

/** "Mar 2023" -> "2023-03", "03/2023" -> "2023-03", "2021" -> "2021", "Present" -> null. */
export function toIsoish(point: string): string | null {
  const p = point.trim().toLowerCase().replace(/\./g, "");
  if (new RegExp(`^${NOW}$`, "i").test(p)) return null;
  let m = /^([a-z]+)\s+(\d{4})$/.exec(p);
  if (m) {
    const month = MONTHS[m[1].slice(0, m[1].startsWith("sept") ? 4 : 3)];
    return month ? `${m[2]}-${String(month).padStart(2, "0")}` : m[2];
  }
  m = /^(\d{1,2})\/(\d{4})$/.exec(p);
  if (m) return `${m[2]}-${String(Math.min(12, Math.max(1, Number(m[1])))).padStart(2, "0")}`;
  m = /^(\d{4})$/.exec(p);
  return m ? m[1] : null;
}

/** The date range on the line(s) where this role is named, if any. */
export function findRange(text: string, role: DatedRole): { start: string | null; end: string | null; current: boolean } | null {
  const needles = [role.company, role.title]
    .map((s) => (s ?? "").trim().toLowerCase())
    .filter((s) => s.length >= 3);
  if (needles.length === 0) return null;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (!needles.some((n) => line.includes(n))) continue;
    // The range is usually on the same line, sometimes on the next one.
    for (const candidate of [lines[i], lines[i + 1] ?? ""]) {
      const m = RANGE.exec(candidate);
      if (!m) continue;
      const current = new RegExp(`^${NOW}$`, "i").test(m[2].trim());
      return { start: toIsoish(m[1]), end: current ? null : toIsoish(m[2]), current };
    }
  }
  return null;
}

export function backfillRoleDates<T extends DatedRole>(roles: T[], text: string): T[] {
  return roles.map((role) => {
    if (role.isCurrent || (role.startDate && role.endDate)) return role;
    const found = findRange(text, role);
    if (!found) return role;
    return {
      ...role,
      startDate: role.startDate || found.start || undefined,
      endDate: role.endDate || (found.current ? undefined : found.end || undefined),
      isCurrent: role.isCurrent || found.current,
    };
  });
}
