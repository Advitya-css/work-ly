import { canonicalCompany } from "@/lib/discovery/normalize";
import { canonical } from "@/lib/text-utils";

/**
 * ROLES SOMEONE NEVER WANTS TO SEE AGAIN. Marking a listing "Already applied"
 * or "Not for me" used to hide only that one row, so the same job came back
 * the next day from another job board (or as a repost). A role is now
 * identified by company + title, ignoring which board found it, its exact
 * location wording and its posting id. Pure, so it can be tested.
 */

/** "Acme, Inc." + "Senior Analyst (m/f/d)" -> "acme|senior analyst m f d". Null without a company: too vague to hide on. */
export function roleKey(company: string | null | undefined, title: string | null | undefined): string | null {
  const c = canonicalCompany(company ?? null);
  const t = canonical(title ?? "");
  if (!c || !t) return null;
  return `${c}|${t}`;
}

export function isHiddenRole(
  job: { company: string | null; title: string },
  hidden: ReadonlySet<string>,
): boolean {
  const key = roleKey(job.company, job.title);
  return key !== null && hidden.has(key);
}
