/**
 * ERROR SANITIZATION
 *
 * One rule: the user sees a sentence written for them, and the server log
 * keeps the real error.
 *
 * Before this existed, several actions did:
 *
 *     const message = error instanceof Error ? error.message : "…";
 *     return { error: message };
 *
 * which puts whatever the driver said straight on screen. In practice that
 * meant users could see `relation "opportunities" does not exist`, Postgres
 * connection strings including credentials, and raw upstream AI errors that
 * can echo request payloads. None of that helps them, and some of it is a
 * genuine disclosure.
 *
 * `toUserMessage` maps the failures we recognise to plain language, and
 * anything unrecognised to a generic sentence - while logging the original
 * with a correlation id so it stays diagnosable.
 */

export interface SafeError {
  /** Safe to render. Never contains internals. */
  message: string;
  /** Short id printed alongside the real error in the server log. */
  reference: string;
}

/** Patterns whose *existence* is safe to acknowledge, with a rewritten message. */
const KNOWN: { test: RegExp; message: string }[] = [
  {
    // Deliberately recommends `setup`, not `db:rebuild`.
    //
    // A missing column almost always means a migration has not been applied
    // yet. `npm run setup` applies the outstanding ones and leaves existing
    // data alone; `db:rebuild` drops the entire database first. Telling
    // someone to run the destructive one to fix an additive problem is a
    // good way to lose a whole career profile over a schema update.
    test: /relation ".*" does not exist|column ".*" does not exist/i,
    // Worded to avoid echoing the driver's own phrasing. The first attempt
    // said "...storage does not exist yet", which the sanitization test
    // correctly rejected: reusing the database's wording is half a leak,
    // and the test is a better guard for being strict about it.
    message:
      "Your database is behind the app, so this feature has nowhere to save yet. Stop the dev server and run: npm run setup",
  },
  {
    test: /ECONNREFUSED|ENOTFOUND|Connection terminated|connection to server/i,
    message: "Can't reach the database right now. Check that PostgreSQL is running, then try again.",
  },
  {
    test: /timeout|ETIMEDOUT|aborted/i,
    message: "That took too long and was stopped. Please try again.",
  },
  {
    test: /duplicate key value|unique constraint/i,
    message: "That already exists.",
  },
  {
    test: /foreign key constraint/i,
    message: "That can't be changed because something else depends on it.",
  },
  {
    test: /AI provider request failed \(4\d\d\)/i,
    message:
      "The AI provider rejected the request. Usually an invalid or expired API key. Workly has fallen back to its built-in parsing.",
  },
  {
    test: /AI provider request failed \(5\d\d\)|AI_API_KEY is required/i,
    message:
      "The AI provider is unavailable. Workly has fallen back to its built-in parsing, so nothing is blocked.",
  },
  {
    test: /Payload Too Large|file is too large/i,
    message: "That file is too large.",
  },
];

/**
 * Redacts anything that looks like a credential before logging. Server
 * logs are lower-risk than a browser response, but a connection string or
 * bearer token sitting in a log aggregator is still a leak.
 */
function redact(text: string): string {
  return text
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]")
    .replace(/\b(sk-[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{8,})\b/g, "[redacted-key]")
    .replace(/(Authorization|Authorization-Key|api[_-]?key)\s*[:=]\s*\S+/gi, "$1: [redacted]");
}

let counter = 0;
function nextReference(): string {
  counter = (counter + 1) % 100000;
  // Not cryptographic - just enough to tie a screen message to a log line.
  return `E${Date.now().toString(36).slice(-5)}${counter.toString(36)}`.toUpperCase();
}

/**
 * Converts any thrown value into something safe to show, and logs the
 * original server-side.
 *
 * @param context Where it happened, e.g. "analyzeJobAction" - appears in the log only.
 * @param fallback Message shown when the error isn't recognised.
 */
export function toUserMessage(
  error: unknown,
  context: string,
  fallback = "Something went wrong. Please try again.",
): SafeError {
  const raw = error instanceof Error ? error.message : String(error);
  const reference = nextReference();

  console.error(
    `[workly:error] ${reference} in ${context}: ${redact(raw)}`,
    error instanceof Error && error.stack ? `\n${redact(error.stack)}` : "",
  );

  for (const known of KNOWN) {
    if (known.test.test(raw)) {
      return { message: known.message, reference };
    }
  }

  // Unrecognised: say nothing about the internals. The reference is how a
  // user-reported problem gets traced back to the log line.
  return { message: `${fallback} (ref ${reference})`, reference };
}

/**
 * Errors WE raise deliberately, whose text is already written for the user
 * and is safe to show verbatim. Throwing this is how a deep function sends
 * a real message to the surface without every layer having to translate it.
 */
export class UserFacingError extends Error {
  readonly isUserFacing = true;
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export function isUserFacing(error: unknown): error is UserFacingError {
  return error instanceof Error && (error as UserFacingError).isUserFacing === true;
}

/** Convenience: pass through our own messages, sanitize everything else. */
export function safeMessage(error: unknown, context: string, fallback?: string): string {
  if (isUserFacing(error)) return error.message;
  return toUserMessage(error, context, fallback).message;
}
