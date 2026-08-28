import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, it, expect } from "vitest";

/**
 * Regression guard for a real, shipped bug: three AI prompt-building files
 * (tailor-ai.ts, action-plan-ai.ts, pathway-planner.ts) had their template
 * literal interpolations accidentally escaped - `\${targetRole}` instead of
 * `${targetRole}`. A backslash-escaped `${` inside a backtick string is not
 * interpolated at all; it's sent to the AI as the literal seven characters
 * `${targetRole}`. Every one of those "premium AI" features - resume/cover-
 * letter tailoring, the 30/60/90 day action plan, the pathway masterclass
 * rewrite - was silently sending the AI broken placeholder text instead of
 * the candidate's actual profile, target role, or job description, for as
 * long as this went unnoticed. There is no reason `\${` should ever appear
 * inside a prompt template in this codebase, so its mere presence is the
 * bug, independent of which file it turns up in next.
 */

const AI_DIR = path.resolve(__dirname, "..", "src", "lib", "ai");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("AI prompt template literals are never escaped", () => {
  it("finds the AI provider files", () => {
    expect(walk(AI_DIR).length).toBeGreaterThan(0);
  });

  it("contains no `\\${` anywhere under lib/ai — that is always a broken interpolation, never intentional", () => {
    const offenders: string[] = [];
    for (const file of walk(AI_DIR)) {
      const source = readFileSync(file, "utf8");
      if (source.includes("\\${")) offenders.push(path.relative(AI_DIR, file));
    }
    expect(offenders, `escaped template interpolations in: ${offenders.join(", ")}`).toEqual([]);
  });
});
