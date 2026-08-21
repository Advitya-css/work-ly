import "server-only";

/**
 * Environment validation.
 *
 * Checks that run once, at startup, and FAIL LOUDLY in production rather
 * than degrading quietly. The failure mode this exists to prevent: shipping
 * with `AUTH_SECRET="dev-only-secret-change-me"` - the value committed in
 * .env.example. Anyone who has read the repository could then forge a
 * session cookie for any account. That is a total authentication bypass,
 * and it would produce no error, no warning and no symptom until exploited.
 *
 * In development these are warnings, because a dev secret is exactly right
 * for development. The distinction is drawn on NODE_ENV, and production
 * refuses to boot rather than start insecurely.
 */

/// The value shipped in .env.example. Must never reach production.
const KNOWN_DEV_SECRETS = new Set(["dev-only-secret-change-me", "changeme", "secret", "development"]);

const MIN_SECRET_LENGTH = 32;

export interface EnvProblem {
  variable: string;
  message: string;
  fix: string;
  severity: "fatal" | "warning";
}

export function checkEnvironment(): EnvProblem[] {
  const problems: EnvProblem[] = [];
  const isProduction = process.env.NODE_ENV === "production";

  // --- Database ---------------------------------------------------------
  if (!process.env.DATABASE_URL) {
    problems.push({
      variable: "DATABASE_URL",
      message: "No database connection string is set.",
      fix: "Copy .env.example to .env, or set DATABASE_URL in your host's environment.",
      severity: "fatal",
    });
  }

  // --- Session signing key ---------------------------------------------
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    problems.push({
      variable: "AUTH_SECRET",
      message: "No session signing key is set, so sessions cannot be created.",
      fix: "Generate one with: openssl rand -base64 32",
      severity: "fatal",
    });
  } else if (KNOWN_DEV_SECRETS.has(secret.trim())) {
    problems.push({
      variable: "AUTH_SECRET",
      message:
        "The session signing key is still the example value from .env.example. Anyone who has seen this repository could forge a login for any account.",
      fix: "Generate a real one with: openssl rand -base64 32",
      severity: isProduction ? "fatal" : "warning",
    });
  } else if (secret.length < MIN_SECRET_LENGTH) {
    problems.push({
      variable: "AUTH_SECRET",
      message: `The session signing key is only ${secret.length} characters, which is short enough to be brute-forced.`,
      fix: `Use at least ${MIN_SECRET_LENGTH} characters: openssl rand -base64 32`,
      severity: isProduction ? "fatal" : "warning",
    });
  }

  // --- AI provider ------------------------------------------------------
  // Not fatal in either environment: Workly is designed to run fully
  // without an AI key (heuristic parsing, deterministic scoring). This
  // only catches the half-configured state, which silently falls back and
  // looks like the feature is broken.
  if (process.env.AI_PROVIDER === "openai-compatible" && !process.env.AI_API_KEY) {
    problems.push({
      variable: "AI_API_KEY",
      message:
        'AI_PROVIDER is "openai-compatible" but no API key is set, so every AI call will fail and fall back to heuristic parsing.',
      fix: 'Set AI_API_KEY, or set AI_PROVIDER="stub" to use heuristic parsing deliberately.',
      severity: "warning",
    });
  }

  // --- Public URL -------------------------------------------------------
  if (isProduction && !process.env.NEXT_PUBLIC_APP_URL) {
    problems.push({
      variable: "NEXT_PUBLIC_APP_URL",
      message: "No public app URL is set, which breaks absolute links.",
      fix: "Set NEXT_PUBLIC_APP_URL to your deployed origin, e.g. https://workly.example.com",
      severity: "warning",
    });
  }

  return problems;
}

/**
 * Called once at startup (see instrumentation.ts). Throws in production if
 * anything fatal is wrong, so a misconfigured deploy fails at boot with a
 * readable message instead of at the first user request with a stack trace.
 */
export function assertEnvironment(): void {
  const problems = checkEnvironment();
  if (problems.length === 0) return;

  const fatal = problems.filter((p) => p.severity === "fatal");
  const warnings = problems.filter((p) => p.severity === "warning");

  for (const problem of warnings) {
    console.warn(
      `[workly:env] WARNING ${problem.variable}: ${problem.message}\n            Fix: ${problem.fix}`,
    );
  }

  if (fatal.length > 0) {
    const detail = fatal
      .map((p) => `  ✗ ${p.variable}: ${p.message}\n    Fix: ${p.fix}`)
      .join("\n\n");
    const message = `Workly cannot start, ${fatal.length} environment problem(s):\n\n${detail}\n`;
    console.error(`[workly:env]\n${message}`);
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }
  }
}
