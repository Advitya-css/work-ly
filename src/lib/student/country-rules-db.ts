import "server-only";

import { pool } from "@/lib/db/pool";
import { COUNTRY_RULES } from "@/lib/student/legal-limits";

export interface SupportedStudentCountry {
  code: string;
  label: string;
  unverified: boolean;
}

const STATIC_FALLBACK: SupportedStudentCountry[] = COUNTRY_RULES.map((c) => ({
  code: c.code,
  label: c.label,
  unverified: Boolean(c.unverified),
}));

/**
 * The list of countries every country picker in the app should offer.
 *
 * Reads from the `student_country_rules` table (see migration
 * 20261014000000_student_country_rules), which is what makes this
 * data-driven rather than a hardcoded import wherever a picker is built.
 * Falls back to the static list in legal-limits.ts if the table is empty
 * or not yet migrated - this must never be the reason a country picker
 * renders with zero options.
 */
export async function listSupportedStudentCountries(): Promise<SupportedStudentCountry[]> {
  try {
    const { rows } = await pool.query(
      `SELECT code, label, unverified FROM student_country_rules ORDER BY label ASC`,
    );
    if (rows.length > 0) {
      return rows.map((r) => ({ code: r.code, label: r.label, unverified: r.unverified }));
    }
  } catch {
    // Table not migrated yet on this environment - fall through to the
    // static list rather than breaking every student page.
  }
  return STATIC_FALLBACK;
}

export async function isSupportedStudentCountry(code: string): Promise<boolean> {
  const countries = await listSupportedStudentCountries();
  return countries.some((c) => c.code === code);
}
