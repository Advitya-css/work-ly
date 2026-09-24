/**
 * Whether a role is technical enough for a coding challenge (vs a written
 * work scenario). Whole words only: the old check matched "it" inside
 * "waitress", "recruiter", "hospitality", "writer", "editor" and "digital",
 * which handed coding tasks to most non-technical roles.
 *
 * No server-only import - the challenge card uses this in the browser.
 */
export function isTechnicalRole(title: string | null | undefined, industry?: string | null): boolean {
  const text = `${title ?? ""} ${industry ?? ""}`;
  return /\b(engineer(ing)?|developer|software|programmer|front[\s-]?end|back[\s-]?end|full[\s-]?stack|devops|sre|data (scientist|engineer)|machine learning|ml engineer|ai engineer|cloud|security engineer|it support|it administrator|sysadmin|qa|test automation|mobile|web)\b/i.test(
    text,
  );
}
