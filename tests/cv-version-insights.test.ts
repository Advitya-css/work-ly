import { describe, expect, it } from "vitest";

import { buildInsights } from "@/lib/applications/insights";
import { TAILORED_CV_LABEL } from "@/lib/applications/cv-version";
import type { Application } from "@/lib/db/types";

function app(i: number, cvVersion: string | null, interviewed: boolean): Application {
  return {
    id: `a${i}`, userId: "u", status: "APPLIED", roleTitle: `Role ${i}`, company: `Co ${i}`, industry: null,
    location: null, country: null, cvVersion, reachedInterviewAt: interviewed ? new Date() : null,
    fitScoreAtApply: null,
  } as unknown as Application;
}

describe("CV version insights", () => {
  it("says tailoring works when tailored applications interview more", () => {
    const apps = [
      app(1, TAILORED_CV_LABEL, true), app(2, TAILORED_CV_LABEL, true), app(3, TAILORED_CV_LABEL, false), app(4, TAILORED_CV_LABEL, true),
      app(5, "My base resume", false), app(6, "My base resume", false), app(7, "My base resume", true), app(8, "My base resume", false),
    ];
    const result = buildInsights(apps);
    expect(result.insights.some((i) => i.dimension === "cv_version" && i.text.startsWith("Tailored resumes"))).toBe(true);
  });

  it("stays quiet with too few applications", () => {
    const result = buildInsights([app(1, TAILORED_CV_LABEL, true), app(2, "My base resume", false)]);
    expect(result.notEnoughData).toBe(true);
  });
});
