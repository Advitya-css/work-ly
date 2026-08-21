import "server-only";

/**
 * Turns whatever Postgres gave us for an array column into a real JS array.
 *
 * Why this exists
 * ---------------
 * node-postgres parses array columns for the types it ships parsers for -
 * text[], int[], float8[] and friends all arrive as proper JS arrays. Custom
 * ENUM arrays do not: their type OIDs are created by the migration, so the
 * driver has never heard of them and hands back the raw Postgres literal as
 * a string:
 *
 *     workModes      →  '{}'            (a string, not [])
 *     workModes      →  '{HYBRID,REMOTE}'
 *
 * `'{}'.map` is not a function, so the first page to render a career goal
 * crashed with a server error - and because the string is truthy, `?? []`
 * did not catch it. That failure survived every type check and every build:
 * TypeScript believed the column was `WorkMode[]`, and it was, in the
 * database. Only the wire format differed.
 *
 * Rather than register OID parsers at startup - which needs an extra query
 * before the first request and re-breaks whenever a migration adds an enum -
 * every array column is read through here. It costs nothing for the columns
 * the driver already parses, and it is impossible to forget in a way that
 * type-checks.
 */
export function toArray<T extends string>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value === null || value === undefined) return [];

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "{}") return [];
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return [];
    return parseLiteral(trimmed.slice(1, -1)) as T[];
  }

  return [];
}

/**
 * Parses the inside of a Postgres array literal. Elements are comma
 * separated; any element containing a comma, quote, brace or whitespace is
 * double-quoted, with backslash escapes inside.
 */
function parseLiteral(body: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  let escaped = false;

  for (const char of body) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      out.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current);

  // An unquoted NULL is Postgres's null element; drop it rather than let the
  // string "NULL" leak into the UI as if it were a value.
  return out.filter((value) => value !== "" && value !== "NULL");
}
