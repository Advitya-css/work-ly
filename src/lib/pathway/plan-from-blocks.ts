import type { OpportunityWithJob, SprintBlock } from "@/lib/db/types";
import type { NewPathwayAction, NewPathwayStep } from "@/lib/db/career-pathways";
import { normalize, skillsMatch } from "@/lib/scoring/shared";

/**
 * Maps week-by-week plan blocks (lib/dream-job/sprint-plan.ts) onto the
 * pathway's 30/60/90-day action windows, keeping the week numbers in the
 * title so "Weeks 3-4" still reads as a sequence inside a window.
 */

function windowFor(startWeek: number): NewPathwayAction["window"] {
  if (startWeek <= 4) return "DAYS_0_30";
  if (startWeek <= 8) return "DAYS_31_60";
  return "DAYS_61_90";
}

function weeksLabel(b: SprintBlock): string {
  return b.startWeek === b.endWeek ? `Week ${b.startWeek}` : `Weeks ${b.startWeek}–${b.endWeek}`;
}

function stepIndexFor(block: SprintBlock, steps: NewPathwayStep[]): number | null {
  for (const closed of block.closes) {
    const n = normalize(closed);
    const idx = steps.findIndex(
      (s) => (s.relatedSkill && (normalize(s.relatedSkill) === n || skillsMatch(s.relatedSkill, closed))) || normalize(s.title).includes(n),
    );
    if (idx >= 0) return idx;
  }
  if (block.closes.length === 0 && steps.length > 0) return steps.length - 1;
  return null;
}

export function blocksToActions(
  blocks: SprintBlock[],
  steps: NewPathwayStep[],
  opportunities: OpportunityWithJob[],
): NewPathwayAction[] {
  const orderIn: Record<NewPathwayAction["window"], number> = { DAYS_0_30: 0, DAYS_31_60: 0, DAYS_61_90: 0 };
  return blocks.map((block, i) => {
    const window = windowFor(block.startWeek);
    const weeks = block.endWeek - block.startWeek + 1;
    const related = opportunities
      .filter((o) =>
        block.closes.some((c) => [...o.job.requiredSkills, ...o.job.preferredSkills].some((s) => skillsMatch(s, c) || skillsMatch(c, s))),
      )
      .map((o) => `${o.job.title ?? "Untitled role"}${o.job.company ? ` at ${o.job.company}` : ""}`)
      .slice(0, 5);
    const description = [
      "**Do this:**",
      ...block.actions.map((a) => `- ${a}`),
      "",
      `**Deliverable:** ${block.deliverable}`,
      `**Done when:** ${block.doneWhen}`,
      block.resource ? `**Suggested resource:** ${block.resource}` : null,
    ]
      .filter((line) => line !== null)
      .join("\n");
    return {
      stepIndex: stepIndexFor(block, steps),
      window,
      order: orderIn[window]++,
      title: `${weeksLabel(block)} · ${block.focus}`,
      description,
      priority: i + 1,
      estimatedTime: `${weeks} week${weeks === 1 ? "" : "s"} (~${block.hoursPerWeek} h/week)`,
      difficulty: weeks >= 3 ? "Hard" : weeks === 2 ? "Moderate" : "Easy",
      expectedImpact:
        (block.closes.length > 0 ? `Makes provable: ${block.closes.join("; ")}.` : "Turns readiness into interviews.") +
        (block.readinessAfter != null ? ` Readiness after this block: about ${block.readinessAfter}/100.` : ""),
      relatedSkill: block.closes[0] ?? null,
      relatedTargetJobs: related,
    };
  });
}
