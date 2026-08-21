import { describe, it, expect } from "vitest";

import { summarize, applyFilters, wasSent } from "@/lib/applications/analytics";
import { buildInsights, INSIGHT_THRESHOLDS } from "@/lib/applications/insights";
import { validateResumeFile } from "@/lib/validations/document";
import { checkEnvironment } from "@/lib/env";
import { toUserMessage, UserFacingError, safeMessage } from "@/lib/errors";
import type { Application } from "@/lib/db/types";

const now = new Date();

function application(overrides: Partial<Application> = {}): Application {
  return {
    id: `app-${Math.random()}`,
    userId: "user-1",
    opportunityId: null,
    jobId: null,
    jobAnalysisId: null,
    roleTitle: "Product Analyst",
    company: "Acme",
    industry: "Software",
    location: "London",
    country: "United Kingdom",
    fitScoreAtApply: 70,
    priorityScoreAtApply: 60,
    status: "APPLIED",
    outcome: "PENDING",
    dateApplied: now,
    reachedAssessmentAt: null,
    reachedInterviewAt: null,
    reachedOfferAt: null,
    closedAt: null,
    cvVersion: null,
    coverLetter: null,
    notes: null,
    contacts: [],
    interviews: [],
    salaryOffered: null,
    salaryCurrency: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("application analytics", () => {
  it("counts an interview that ended in rejection", () => {
    // THE critical property. Reading `status` would report 0% to someone
    // who has been interviewing steadily but getting rejected.
    const apps = [
      application({ status: "REJECTED", outcome: "REJECTED", reachedInterviewAt: now, closedAt: now }),
      application({ status: "APPLIED" }),
      application({ status: "APPLIED" }),
      application({ status: "APPLIED" }),
    ];
    const summary = summarize(apps);
    expect(summary.applications).toBe(4);
    expect(summary.interviews).toBe(1);
    expect(summary.interviewRate).toBe(25);
  });

  it("excludes unsent applications from the denominator", () => {
    // Counting SAVED/PREPARING would deflate every rate.
    const apps = [
      application({ status: "SAVED" }),
      application({ status: "PREPARING" }),
      application({ status: "APPLIED", reachedInterviewAt: now }),
    ];
    const summary = summarize(apps);
    expect(summary.applications).toBe(1);
    expect(summary.interviewRate).toBe(100);
  });

  it("returns null rather than 0 when there is nothing to divide by", () => {
    // "No data" and "0%" mean very different things and must not render alike.
    const summary = summarize([]);
    expect(summary.interviewRate).toBeNull();
    expect(summary.offerRate).toBeNull();
  });

  it("treats an offer as having reached interview for rate purposes", () => {
    const apps = [
      application({ status: "OFFER", outcome: "OFFER", reachedInterviewAt: now, reachedOfferAt: now }),
      application({ status: "APPLIED" }),
    ];
    const summary = summarize(apps);
    expect(summary.offers).toBe(1);
    expect(summary.offerRate).toBe(50);
    expect(summary.offerPerInterviewRate).toBe(100);
  });

  it("wasSent excludes pre-submission stages only", () => {
    expect(wasSent(application({ status: "SAVED" }))).toBe(false);
    expect(wasSent(application({ status: "PREPARING" }))).toBe(false);
    expect(wasSent(application({ status: "REJECTED" }))).toBe(true);
    expect(wasSent(application({ status: "WITHDRAWN" }))).toBe(true);
  });

  it("filters by role, industry and date without dropping unrelated fields", () => {
    const apps = [
      application({ roleTitle: "Product Analyst", industry: "Software" }),
      application({ roleTitle: "Chef", industry: "Hospitality" }),
    ];
    expect(applyFilters(apps, { role: "analyst" })).toHaveLength(1);
    expect(applyFilters(apps, { industry: "Hospitality" })).toHaveLength(1);
    expect(applyFilters(apps, {})).toHaveLength(2);
  });
});

describe("career-learning insights", () => {
  it("refuses to draw conclusions from a tiny sample", () => {
    // The failure mode this prevents: "1 of 1 research roles interviewed,
    // so you interview best at research roles" — confident nonsense.
    const apps = Array.from({ length: 3 }, () => application({ reachedInterviewAt: now }));
    const result = buildInsights(apps);
    expect(result.notEnoughData).toBe(true);
    expect(result.insights).toHaveLength(0);
    expect(result.needed).toBe(INSIGHT_THRESHOLDS.MIN_SENT - 3);
  });

  it("surfaces a genuine pattern once the sample is large enough", () => {
    const research = Array.from({ length: 4 }, () =>
      application({ industry: "Research", reachedInterviewAt: now }),
    );
    const other = Array.from({ length: 6 }, () => application({ industry: "Retail" }));
    const result = buildInsights([...research, ...other]);
    expect(result.notEnoughData).toBe(false);
    const industries = result.insights.filter((i) => i.dimension === "industry");
    expect(industries.length).toBeGreaterThan(0);
    expect(industries[0].text).toContain("Research");
  });

  it("attaches a sample size to every claim it makes", () => {
    const research = Array.from({ length: 4 }, () =>
      application({ industry: "Research", reachedInterviewAt: now }),
    );
    const other = Array.from({ length: 6 }, () => application({ industry: "Retail" }));
    for (const insight of buildInsights([...research, ...other]).insights) {
      expect(insight.sampleSize).toBeGreaterThanOrEqual(INSIGHT_THRESHOLDS.MIN_GROUP);
      expect(insight.supportingDetail).toBeTruthy();
    }
  });

  it("stays silent when no group meaningfully outperforms another", () => {
    // A flat result set should produce no claim, not a manufactured one.
    const apps = Array.from({ length: 12 }, (_, i) =>
      application({ industry: i % 2 === 0 ? "A" : "B" }),
    );
    const result = buildInsights(apps);
    expect(result.notEnoughData).toBe(false);
    expect(result.insights).toHaveLength(0);
  });
});

describe("file upload validation", () => {
  it("rejects an unsupported type", () => {
    expect(validateResumeFile({ name: "a.exe", type: "application/x-msdownload", size: 100 }).ok).toBe(false);
  });

  it("rejects an oversized file", () => {
    expect(validateResumeFile({ name: "a.pdf", type: "application/pdf", size: 99_000_000 }).ok).toBe(false);
  });

  it("rejects an empty file", () => {
    expect(validateResumeFile({ name: "a.pdf", type: "application/pdf", size: 0 }).ok).toBe(false);
  });

  it("rejects a mismatch between extension and declared type", () => {
    expect(
      validateResumeFile({ name: "a.pdf", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 100 }).ok,
    ).toBe(false);
  });

  it("accepts a valid PDF", () => {
    const result = validateResumeFile({ name: "cv.pdf", type: "application/pdf", size: 5000 });
    expect(result.ok).toBe(true);
    expect(result.fileType).toBe("PDF");
  });
});

describe("error sanitization", () => {
  it("never leaks a database error to the user", () => {
    const { message } = toUserMessage(
      new Error('relation "opportunities" does not exist'),
      "test",
    );
    expect(message).not.toContain("relation");
    expect(message).not.toContain("does not exist");
  });

  it("never leaks a connection string", () => {
    const { message } = toUserMessage(
      new Error("connect ECONNREFUSED postgresql://postgres:hunter2@localhost:5432/db"),
      "test",
    );
    expect(message).not.toContain("hunter2");
    expect(message).not.toContain("postgresql://");
  });

  it("gives an unrecognised error a generic message plus a traceable reference", () => {
    const { message, reference } = toUserMessage(new Error("something deeply internal"), "test");
    expect(message).not.toContain("deeply internal");
    expect(message).toContain(reference);
  });

  it("passes through messages we wrote for the user", () => {
    expect(safeMessage(new UserFacingError("Paste the full job description."), "test")).toBe(
      "Paste the full job description.",
    );
  });
});

describe("environment validation", () => {
  it("flags the example signing key as a problem", () => {
    const original = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "dev-only-secret-change-me";
    try {
      const problems = checkEnvironment();
      expect(problems.some((p) => p.variable === "AUTH_SECRET")).toBe(true);
    } finally {
      process.env.AUTH_SECRET = original;
    }
  });

  it("flags a signing key that is too short to be safe", () => {
    const original = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "short";
    try {
      expect(checkEnvironment().some((p) => p.variable === "AUTH_SECRET")).toBe(true);
    } finally {
      process.env.AUTH_SECRET = original;
    }
  });

  it("accepts a strong key", () => {
    const original = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "a".repeat(48);
    try {
      expect(checkEnvironment().some((p) => p.variable === "AUTH_SECRET")).toBe(false);
    } finally {
      process.env.AUTH_SECRET = original;
    }
  });
});
