import { describe, expect, it } from "vitest";

import { beforeYouApply } from "@/components/opportunities/analysis/job-analysis-view";
import { displayJobTitle } from "@/lib/format";

describe("beforeYouApply", () => {
  it("merges gaps, improvements and risks without repeating the same point", () => {
    const todo = beforeYouApply({
      gaps: [
        { type: "SKILL_GAP", title: "1 required skill not on your profile", description: "Designed and analysed A/B tests end to end" },
        { type: "EVIDENCE_GAP", title: "Matched skills lack strong evidence", description: "Most of your matched skills are self-stated rather than backed by a project or certification." },
      ],
      improvements: [
        "Strengthen evidence on your existing skills. Link a project, certification, or specific outcome.",
        "Work-ly could not assess 3 parts of this comparison. Filling in the gaps noted above will make the score meaningful.",
        "Add evidence for: Designed and analysed A/B tests end to end. Even a brief project or course helps.",
      ],
      risks: ["1 mandatory requirement you do not appear to meet. Reviewers may screen you out on these."],
    } as never);
    expect(todo.map((t) => t.title)).toEqual([
      "1 required skill not on your profile",
      "Matched skills lack strong evidence",
    ]);
  });

  it("caps the list at five", () => {
    const todo = beforeYouApply({
      gaps: [],
      improvements: ["Learn Airflow basics", "Publish a dbt project", "Get the Snowflake cert", "Write a case study on churn", "Practise SQL window functions", "Read about Kimball modelling"],
      risks: [],
    } as never);
    expect(todo).toHaveLength(5);
  });
});

describe("displayJobTitle", () => {
  it("drops the form's label and handles empty titles", () => {
    expect(displayJobTitle("Title: Senior Data Analyst")).toBe("Senior Data Analyst");
    expect(displayJobTitle("Data Analyst")).toBe("Data Analyst");
    expect(displayJobTitle(null)).toBe("Untitled role");
  });
});
