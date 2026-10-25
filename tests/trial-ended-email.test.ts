import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/pool", () => ({
  pool: { query: vi.fn(async () => ({ rows: [{ id: "opp-1", title: "Title: Senior Data Analyst", company: "Swiggy" }] })) },
}));
vi.mock("@/lib/saved-outputs", () => ({
  savedWorkSummary: vi.fn(async () => ({
    counts: { resume: 2, cover: 1, note: 0, interview: 0, linkedin: 0 },
    jobs: [{ opportunityId: "opp-1", kinds: ["resume", "cover"], savedAt: "2026-10-20T00:00:00Z" }],
  })),
}));
vi.mock("@/lib/payments/founding", () => ({
  foundingOfferLine: vi.fn(async () => "Founding price: the 3-Month Pass is $29.99 instead of $49.99."),
}));
vi.mock("@/lib/email", () => ({ sendLifecycleEmail: vi.fn() }));

import { trialEndedEmail } from "@/lib/lifecycle";

describe("trial-ended email", () => {
  it("names what was built, the jobs it was for, and the founding price", async () => {
    const email = await trialEndedEmail(
      { id: "u1", email: "a@example.com", name: "Priya Sharma", createdAt: new Date(), isPayingPro: false, trialEndedAt: new Date() },
      "Hi Priya,",
      "/unsub",
    );
    expect(email.subject).toBe("Your Work-ly trial has ended. Your work is saved");
    expect(email.heading).toBe("2 tailored resumes and a cover letter are waiting for you");
    const text = email.paragraphs.join("\n");
    expect(text).toContain("2 tailored resumes and a cover letter are still saved");
    expect(text).toContain("For: Senior Data Analyst at Swiggy.");
    expect(text).toContain("$29.99 instead of $49.99");
    expect(email.cta.path).toBe("/pricing");
  });
});
