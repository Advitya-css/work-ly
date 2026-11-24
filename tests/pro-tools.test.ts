import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PRO_TOOLS, PRO_TOOL_GROUPS, accessLabel, toolHref } from "@/lib/pro-tools";

/** The page a route lives on, under the signed-in app. */
function pageExists(href: string): boolean {
  const path = href.split(/[?#]/)[0].replace(/^\//, "");
  const parts = path.split("/").map((p) => (/^[0-9a-f-]{8,}$|^opp-1$/.test(p) ? "[id]" : p));
  const candidates = [
    join("src/app/(app)", ...parts, "page.tsx"),
    // The four kit tabs sit in a route group under the job.
    parts[0] === "opportunities" && parts.length === 3 ? join("src/app/(app)/opportunities/[id]/(kit)", parts[2], "page.tsx") : "",
  ].filter(Boolean);
  return candidates.some((c) => existsSync(c));
}

describe("the My Pro list", () => {
  it("links every tool to a page that exists", () => {
    for (const tool of PRO_TOOLS) expect(pageExists(tool.href), tool.name).toBe(true);
  });

  it("opens each kit tool on the job when there is one", () => {
    const kit = PRO_TOOLS.filter((t) => t.perJob);
    expect(kit).toHaveLength(4);
    for (const tool of kit) {
      const href = toolHref(tool, "opp-1");
      expect(href.startsWith("/opportunities/opp-1/"), tool.name).toBe(true);
      expect(pageExists(href), href).toBe(true);
    }
    expect(toolHref(kit[0], null)).toBe("/opportunities");
  });

  it("tells a free account the truth about each tool", () => {
    const label = (name: string) => accessLabel(PRO_TOOLS.find((t) => t.name === name)!, false);
    expect(label("Follow-up email")).toBe("Free");
    expect(label("Counter-offer email")).toBe("Free");
    expect(label("Dream job")).toBe("1 free");
    expect(label("More searches")).toBe("5 a day");
    expect(label("Resume for this job")).toBe("Pro");
  });

  it("shows a member no labels, only the way in", () => {
    for (const tool of PRO_TOOLS) expect(accessLabel(tool, true)).toBeNull();
  });

  it("keeps each group short enough to take in at a glance", () => {
    for (const group of PRO_TOOL_GROUPS) expect(group.tools.length).toBeLessThanOrEqual(4);
  });
});
