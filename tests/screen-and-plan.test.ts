import { describe, expect, it } from "vitest";

import { deterministicScoringProvider as rules } from "@/lib/scoring/providers/stub";
import { buildDossier, combineScreen, groundScreen, projectWithClosed } from "@/lib/scoring/screen-core";
import { sanitizeBlocks } from "@/lib/dream-job/sprint-plan-core";
import { requirementSatisfiedBy } from "@/lib/text-utils";
import { comparePriority } from "@/lib/discovery/sort";
import { exp, goal, job, profile, skill } from "./setup/screen-fixtures";

const priya = profile({
  headline: "Data Analyst | SQL, Tableau, dbt",
  currentRole: "Data Analyst",
  experiences: [
    exp("Data Analyst", "Swiggy", "2021-06-01", null, "Built the dbt models behind the growth team's Looker dashboards (40+ models). Wrote SQL pipelines in BigQuery that cut weekly reporting from 2 days to 2 hours."),
  ],
  skills: [skill("SQL", "DEMONSTRATED"), skill("dbt", "DEMONSTRATED"), skill("Python")],
});
const posting = `Senior Analytics Engineer
Requirements
- Expert SQL and dbt
- Experience orchestrating pipelines with Airflow
- Production Python (testing, packaging)`;
const j = job({ title: "Senior Analytics Engineer", rawInput: posting, seniority: "SENIOR" });

const raw = {
  summary: "Strong dbt analyst; orchestration is the gap.",
  roleRelevance: "adjacent",
  relevanceRationale: "Usual next step.",
  candidateLevel: "MID",
  requirements: [
    { requirement: "Expert SQL and dbt", postingQuote: "Expert SQL and dbt", importance: "critical", category: "skill", verdict: "met", evidenceRef: "E1", evidenceQuote: "Built the dbt models behind the growth team's Looker dashboards" },
    { requirement: "Airflow", postingQuote: "Experience orchestrating pipelines with Airflow", importance: "critical", category: "skill", verdict: "missing", gapToClose: "Schedule your dbt project with Airflow" },
    { requirement: "Production Python", postingQuote: "Production Python (testing, packaging)", importance: "important", category: "skill", verdict: "met", evidenceRef: "E1", evidenceQuote: "Wrote Python packages with 90% test coverage" },
    { requirement: "Kubernetes", postingQuote: "Run Kubernetes clusters", importance: "critical", category: "skill", verdict: "missing" },
  ],
  strengths: [],
};

describe("grounded screen", () => {
  const screen = groundScreen(raw, buildDossier(priya), posting, priya)!;

  it("drops requirements that are not in the posting", () => {
    expect(screen.requirements.map((r) => r.requirement)).not.toContain("Kubernetes");
  });
  it("downgrades a 'met' whose quoted evidence is not on the profile", () => {
    expect(screen.requirements.find((r) => r.requirement === "Production Python")?.verdict).toBe("unclear");
    expect(screen.ungroundedDropped).toBe(1);
  });
  it("caps the score and holds the recommendation while a must-have is missing", () => {
    const a = combineScreen({ screen, rules: rules.analyzeFit({ profile: priya, careerGoal: goal("Analytics Engineer"), job: j }), job: j, profile: priya });
    expect(a.fitScore).toBeLessThanOrEqual(64);
    expect(["APPLY_NOW", "APPLY"]).not.toContain(a.recommendation);
    expect(a.method).toBe("ai-screen");
  });
  it("projects a higher, never lower, score when the missing must-have is closed", () => {
    const params = { screen, rules: rules.analyzeFit({ profile: priya, careerGoal: null, job: j }), job: j, profile: priya };
    const now = combineScreen(params).fitScore;
    expect(projectWithClosed(params, ["Airflow"])).toBeGreaterThan(now);
  });
});

describe("requirement phrase matching", () => {
  it.each([
    ["SQL", "Expert SQL", true],
    ["dbt", "Experience with dbt", true],
    ["React", "React Native experience", false],
    ["Java", "JavaScript experience", false],
    ["Excel", "Excellent communication skills", false],
    ["R", "R&D experience", false],
  ] as const)("%s satisfies %s: %s", (cand, req, expected) => {
    expect(requirementSatisfiedBy(cand, req)).toBe(expected);
  });

  it("a demonstrated SQL/dbt analyst is not scored as a non-match for a SQL/dbt role", () => {
    const fit = rules.analyzeFit({
      profile: priya,
      careerGoal: null,
      job: job({ title: "Analytics Engineer", rawInput: posting, requiredSkills: ["Expert SQL", "Experience with dbt"] }),
    });
    expect(fit.scoreBreakdown.skills.score).toBeGreaterThan(0);
    expect(fit.recommendation).not.toBe("SKIP");
  });
});

describe("week-by-week plan validation", () => {
  it("re-sequences blocks and drops blocks that close gaps nobody identified", () => {
    const blocks = sanitizeBlocks(
      [
        { startWeek: 1, endWeek: 3, focus: "Airflow", closes: ["Airflow"], actions: ["a", "b"], deliverable: "repo", doneWhen: "runs" },
        { startWeek: 2, endWeek: 9, focus: "K8s", closes: ["Kubernetes"], actions: ["a", "b"], deliverable: "x", doneWhen: "y" },
        { startWeek: 2, endWeek: 3, focus: "Python", closes: ["Production Python"], actions: ["a", "b"], deliverable: "pkg", doneWhen: "published" },
      ],
      ["Airflow", "Production Python"],
      8,
    );
    expect(blocks.map((b) => [b.startWeek, b.endWeek, b.focus])).toEqual([
      [1, 3, "Airflow"],
      [4, 5, "Python"],
    ]);
  });
});

describe("discovery ranking", () => {
  it("orders by tier, then by fit and freshness rather than lexical overlap", () => {
    const now = Date.now();
    const mk = (id: string, recommendation: string, fitScore: number, ageDays: number) => ({
      job: { id, recommendation, fitScore, fitCoverage: 0.8, postedAt: new Date(now - ageDays * 864e5), discoveredAt: new Date(now), matchReasons: [] } as never,
      score: 0.6,
    });
    const sorted = [mk("apply-61", "APPLY", 61, 1), mk("apply-88", "APPLY", 88, 2), mk("stretch-95", "STRETCH", 95, 1), mk("now-80", "APPLY_NOW", 80, 5)].sort(comparePriority);
    expect(sorted.map((s) => (s.job as { id: string }).id)).toEqual(["now-80", "apply-88", "apply-61", "stretch-95"]);
  });
});
