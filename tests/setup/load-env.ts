import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Next.js loads `.env` for you; vitest does not. Without this the database
 * suite connects with no credentials and fails with a startup-packet error
 * that looks nothing like "you forgot to load .env".
 *
 * Deliberately hand-rolled rather than pulling in dotenv: it is fifteen
 * lines, and a test harness should not add a runtime dependency.
 * Existing environment variables always win, so CI can override the URL.
 */
for (const file of [".env.test.local", ".env.local", ".env"]) {
  const full = path.resolve(__dirname, "..", "..", file);
  if (!existsSync(full)) continue;

  for (const line of readFileSync(full, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    if (key in process.env) continue;

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
