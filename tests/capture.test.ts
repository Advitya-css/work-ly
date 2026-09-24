import { describe, expect, it } from "vitest";

import { bookmarkletSource, decodeCapture, encodeCapture } from "@/lib/capture/capture";

const job = {
  title: "Analytics Engineer",
  company: "Postman",
  text: "We are hiring an Analytics Engineer in Bengaluru. You will own dbt models, SQL and semantic layers. ₹ salaries, Hindi: नमस्ते.",
  url: "https://www.linkedin.com/jobs/view/123",
  site: "www.linkedin.com",
};

describe("capture", () => {
  it("round-trips a captured job, including non-ASCII text", () => {
    const decoded = decodeCapture(`#capture=${encodeCapture(job)}`);
    expect(decoded?.title).toBe("Analytics Engineer");
    expect(decoded?.text).toContain("नमस्ते");
    expect(decoded?.site).toBe("linkedin.com");
  });

  it("rejects malformed, too-short or unsafe captures", () => {
    expect(decodeCapture("#capture=!!!")).toBeNull();
    expect(decodeCapture("#something=else")).toBeNull();
    expect(decodeCapture(`#capture=${encodeCapture({ ...job, text: "too short" })}`)).toBeNull();
    expect(decodeCapture(`#capture=${encodeCapture({ ...job, url: "javascript:alert(1)" })}`)?.url).toBe("");
  });

  it("builds a bookmarklet that targets the analyzer on this origin", () => {
    const src = bookmarkletSource("https://work-ly.in");
    expect(src.startsWith("javascript:")).toBe(true);
    const code = decodeURIComponent(src.slice("javascript:".length));
    expect(code).toContain('"https://work-ly.in"+\'/analyze-job#capture=\'');
    // It must be valid JavaScript.
    expect(() => new Function(code)).not.toThrow();
  });
});
