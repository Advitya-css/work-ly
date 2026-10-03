import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { THEME_SCRIPT, THEME_SCRIPT_HASH } from "@/lib/theme-script";

describe("theme script CSP hash", () => {
  it("matches the script, or the strict pages would block it", () => {
    const actual = `sha256-${createHash("sha256").update(THEME_SCRIPT, "utf8").digest("base64")}`;
    expect(THEME_SCRIPT_HASH, `set THEME_SCRIPT_HASH to ${actual}`).toBe(actual);
  });
});
