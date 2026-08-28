import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateTailoredApplication, generateFollowUpEmail } from "../src/lib/ai/providers/tailor-ai";
import { aiProvider } from "../src/lib/ai/index";
import type { CareerProfile, Job, Application } from "../src/lib/db/types";

// Mock the AI provider
vi.mock("../src/lib/ai/index", () => ({
  aiProvider: {
    complete: vi.fn(),
  },
}));

describe("AI Tailoring & Reminders", () => {
  // Shaped like FullCareerProfile (profile + structured child arrays), not
  // the old flat CareerProfile - generateTailoredApplication used to take
  // the flat shape and read .experience/.education off it, fields that
  // don't exist on that type at all. That went unnoticed because the
  // prompt template's interpolations were accidentally escaped
  // (`\${profile.experience}` instead of `${profile.experience}`), so the
  // AI was silently sent the literal placeholder text instead of any real
  // profile data. This fixture, and the assertion below, guard against
  // that regressing.
  const mockProfile = {
    profile: {
      id: "prof-1",
      userId: "user-1",
      headline: "Frontend Engineer",
      summary: "React specialist focused on performance.",
      isPartTimeMode: false,
      isFreelanceMode: false,
    },
    experiences: [
      { title: "Frontend Engineer", company: "Acme", isCurrent: true, description: "Built React apps." },
    ],
    educations: [{ degree: "B.S.", fieldOfStudy: "Computer Science", institution: "State University" }],
    skills: [{ name: "React" }, { name: "TypeScript" }],
    projects: [],
    achievements: [],
    certifications: [],
    documents: [],
  };

  const mockJob = {
    id: "job-1",
    userId: "user-1",
    url: "https://example.com/job",
    title: "Senior Frontend Engineer",
    company: "Vercel",
    description: "Looking for a React expert with TS skills.",
    mandatorySkills: [],
    optionalSkills: [],
    status: "PARSED",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockApplication = {
    id: "app-1",
    userId: "user-1",
    opportunityId: "opp-1",
    jobId: "job-1",
    roleTitle: "Senior Frontend Engineer",
    company: "Vercel",
    status: "INTERVIEW",
    createdAt: new Date(),
    updatedAt: new Date(),
    dateApplied: new Date(Date.now() - 10 * 86400000), // 10 days ago
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully generate and parse a tailored resume and cover letter", async () => {
    vi.mocked(aiProvider.complete).mockResolvedValueOnce({
      content: `{
        "coverLetter": "Dear Vercel,\\n\\nI love Next.js.",
        "resumeBullets": ["Built apps with React", "Scaled TypeScript codebases"]
      }`,
    });

    const result = await generateTailoredApplication(mockProfile as any, mockJob as any);

    expect(result.coverLetter).toContain("Dear Vercel");
    expect(result.resumeBullets).toHaveLength(2);
    expect(result.resumeBullets[0]).toBe("Built apps with React");
    expect(aiProvider.complete).toHaveBeenCalledTimes(1);

    // The prompt actually sent to the AI must contain the candidate's real
    // data, not the literal, unrendered "${...}" template text.
    const prompt = vi.mocked(aiProvider.complete).mock.calls[0][0].messages[0].content;
    expect(prompt).toContain("Frontend Engineer");
    expect(prompt).toContain("State University");
    expect(prompt).not.toContain("${");
  });

  it("should successfully generate a follow-up email", async () => {
    vi.mocked(aiProvider.complete).mockResolvedValueOnce({
      content: "Hi Vercel team,\\n\\nFollowing up on my interview.\\n\\nBest, Candidate",
    });

    const result = await generateFollowUpEmail(mockApplication as any, mockJob as any);
    
    expect(result).toContain("Following up on my interview");
    expect(aiProvider.complete).toHaveBeenCalledTimes(1);
    
    // Check that the prompt includes the correct status context
    const callArgs = vi.mocked(aiProvider.complete).mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("after my recent interview");
  });

  it("should throw an error if tailored application returns invalid JSON schema", async () => {
    vi.mocked(aiProvider.complete).mockResolvedValueOnce({
      content: `{ "wrongKey": "Oops" }`, // Missing coverLetter and resumeBullets
    });

    await expect(generateTailoredApplication(mockProfile as any, mockJob as any)).rejects.toThrow("Failed to generate tailored application.");
  });
});
