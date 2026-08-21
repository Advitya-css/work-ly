#!/usr/bin/env node
/**
 * Pre-flight environment check.
 *
 *   npm run check:env
 *
 * The app runs this same check automatically at boot (src/lib/env.ts), where
 * a fatal problem stops a production server from starting. This script exists
 * so you can see the answer BEFORE deploying, from the terminal, with the
 * exact command to fix each problem - rather than discovering it from a
 * crashed container.
 *
 * The rules are duplicated here deliberately: this script must run with plain
 * node, before any build, with no TypeScript and no dependencies.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const c = {
  reset: "[0m",
  red: "[31m",
  green: "[32m",
  yellow: "[33m",
  dim: "[2m",
  bold: "[1m",
};

function loadEnvFile(file) {
  const full = path.join(root, file);
  if (!existsSync(full)) return {};
  const out = {};
  for (const line of readFileSync(full, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[trimmed.slice(0, eq).trim()] = value;
  }
  return out;
}

const fromFile = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
const env = { ...fromFile, ...process.env };

// Whether to apply production rules. `--production` lets you check a
// deployment's config from a dev machine.
const asProduction = process.argv.includes("--production") || env.NODE_ENV === "production";

const KNOWN_DEV_SECRETS = new Set([
  "dev-only-secret-change-me",
  "changeme",
  "secret",
  "development",
]);
const MIN_SECRET_LENGTH = 32;

const problems = [];
function problem(variable, severity, message, fix) {
  problems.push({ variable, severity, message, fix });
}

if (!env.DATABASE_URL) {
  problem(
    "DATABASE_URL",
    "fatal",
    "No database connection string is set.",
    "Copy .env.example to .env and fill in DATABASE_URL.",
  );
}

const secret = env.AUTH_SECRET;
if (!secret) {
  problem(
    "AUTH_SECRET",
    "fatal",
    "No session signing key is set, so nobody can sign in.",
    "Run: openssl rand -base64 32   then paste the result as AUTH_SECRET in .env",
  );
} else if (KNOWN_DEV_SECRETS.has(secret.trim())) {
  problem(
    "AUTH_SECRET",
    asProduction ? "fatal" : "warning",
    "The signing key is still the example value. Anyone who has seen this repository could forge a login for any account.",
    "Run: openssl rand -base64 32   then paste the result as AUTH_SECRET in .env",
  );
} else if (secret.length < MIN_SECRET_LENGTH) {
  problem(
    "AUTH_SECRET",
    asProduction ? "fatal" : "warning",
    `The signing key is only ${secret.length} characters. At least ${MIN_SECRET_LENGTH} is needed for it to be hard to guess.`,
    "Run: openssl rand -base64 32   then replace AUTH_SECRET in .env (everyone will need to sign in again)",
  );
}

if (env.AI_PROVIDER === "openai-compatible" && !env.AI_API_KEY) {
  problem(
    "AI_API_KEY",
    "warning",
    "AI_PROVIDER is set to a real provider but no key is present, so every AI call falls back to the built-in parser.",
    'Add AI_API_KEY to .env, or set AI_PROVIDER="stub" if you meant to run without AI.',
  );
}

if (asProduction && !env.NEXT_PUBLIC_APP_URL) {
  problem(
    "NEXT_PUBLIC_APP_URL",
    "warning",
    "No public URL is set, which breaks absolute links in production.",
    "Set NEXT_PUBLIC_APP_URL to your live address, e.g. https://workly.example.com",
  );
}

const fatal = problems.filter((p) => p.severity === "fatal");
const warnings = problems.filter((p) => p.severity === "warning");

console.log("");
console.log(`${c.bold}  WORKLY ENVIRONMENT CHECK${c.reset}`);
console.log(
  `  ${c.dim}rules applied: ${asProduction ? "production" : "development"}${c.reset}`,
);
console.log("");

for (const p of [...fatal, ...warnings]) {
  const colour = p.severity === "fatal" ? c.red : c.yellow;
  const mark = p.severity === "fatal" ? "✗" : "!";
  console.log(`  ${colour}${mark} ${p.variable}${c.reset}  ${p.message}`);
  console.log(`    ${c.dim}Fix: ${p.fix}${c.reset}`);
  console.log("");
}

if (fatal.length === 0 && warnings.length === 0) {
  console.log(`  ${c.green}✓ Everything needed is configured.${c.reset}`);
  console.log("");
  process.exit(0);
}

if (fatal.length === 0) {
  console.log(
    `  ${c.green}✓ Nothing fatal.${c.reset} ${c.dim}The app will start; the warnings above are worth fixing.${c.reset}`,
  );
  console.log("");
  process.exit(0);
}

console.log(
  `  ${c.red}✗ ${fatal.length} problem(s) would stop a production server from starting.${c.reset}`,
);
console.log("");
process.exit(1);
