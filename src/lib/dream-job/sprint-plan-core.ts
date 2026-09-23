import type { GapPriority, ImprovementPlanItem, SprintBlock } from "@/lib/db/types";
import { normalizeForMatch } from "@/lib/scoring/screen-core";

/**
 * THE WEEK-BY-WEEK PLAN - pure half (validation, fallback, projection
 * bookkeeping). The model half is sprint-plan.ts.
 *
 * What a plan must be, or it gets rejected/repaired here:
 *   - sequenced in weeks, every block 1-4 weeks, the whole plan <= 26;
 *   - every block names the requirement(s) it makes PROVABLE, and those
 *     names must be real gaps from this analysis (a block that closes
 *     something we never identified is the model freelancing);
 *   - every block ends in a concrete artifact and a checkable finish line.
 */

export const MAX_PLAN_WEEKS = 26;
const MAX_BLOCK_WEEKS = 4;
const MAX_BLOCKS = 8;

export interface RawBlock {
  startWeek?: unknown;
  endWeek?: unknown;
  focus?: unknown;
  closes?: unknown;
  actions?: unknown;
  deliverable?: unknown;
  doneWhen?: unknown;
  resource?: unknown;
}

function str(v: unknown, max = 240): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}
function int(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Maps a model-written gap name back to the canonical gap title, or null if it matches none. */
export function resolveGapName(name: string, gapTitles: string[]): string | null {
  const n = normalizeForMatch(name);
  if (!n) return null;
  const exact = gapTitles.find((t) => normalizeForMatch(t) === n);
  if (exact) return exact;
  const contained = gapTitles.find((t) => {
    const nt = normalizeForMatch(t);
    return nt.length > 3 && (nt.includes(n) || n.includes(nt));
  });
  return contained ?? null;
}

/**
 * Validates and repairs the model's blocks. Blocks are re-sequenced so
 * they run back to back in the order given (keeping each block's length),
 * because a plan whose weeks overlap or leave gaps reads as broken even
 * when every block is individually sensible.
 */
export function sanitizeBlocks(rawBlocks: unknown, gapTitles: string[], hoursPerWeek: number): SprintBlock[] {
  if (!Array.isArray(rawBlocks)) return [];
  const blocks: SprintBlock[] = [];
  let week = 1;
  let unanchored = 0;

  for (const item of rawBlocks.slice(0, MAX_BLOCKS + 2)) {
    if (!item || typeof item !== "object") continue;
    const b = item as RawBlock;
    const focus = str(b.focus, 120);
    const deliverable = str(b.deliverable, 240);
    const doneWhen = str(b.doneWhen, 240);
    const actions = Array.isArray(b.actions)
      ? b.actions.map((a) => str(a, 220)).filter((a): a is string => Boolean(a)).slice(0, 4)
      : [];
    if (!focus || !deliverable || !doneWhen || actions.length < 2) continue;

    const claimed = (Array.isArray(b.closes) ? b.closes : []).filter((c): c is string => typeof c === "string" && c.trim() !== "");
    const closes = Array.from(
      new Set(claimed.map((c) => resolveGapName(c, gapTitles)).filter((c): c is string => Boolean(c))),
    );
    // A block that claims to close gaps we never identified is the model
    // freelancing (a new requirement it invented) - drop it.
    if (claimed.length > 0 && closes.length === 0) continue;
    // One block that closes no named gap is allowed (positioning, or the
    // final "apply" push). More than that is the model padding the plan.
    if (closes.length === 0) {
      if (unanchored >= 1) continue;
      unanchored++;
    }

    const start = int(b.startWeek) ?? week;
    const end = int(b.endWeek) ?? start;
    const length = Math.max(1, Math.min(MAX_BLOCK_WEEKS, end - start + 1));
    if (week + length - 1 > MAX_PLAN_WEEKS) break;

    blocks.push({
      startWeek: week,
      endWeek: week + length - 1,
      focus,
      closes,
      actions,
      deliverable,
      doneWhen,
      resource: str(b.resource, 160),
      hoursPerWeek,
      readinessAfter: null,
    });
    week += length;
    if (blocks.length >= MAX_BLOCKS) break;
  }
  return blocks;
}

const SEQUENCE: Record<string, number> = {
  POSITIONING_GAP: 0,
  EVIDENCE_GAP: 1,
  SKILL_GAP: 2,
  PORTFOLIO_GAP: 3,
  CREDENTIAL_GAP: 4,
  EXPERIENCE_GAP: 5,
  SENIORITY_GAP: 6,
};
const IMPACT_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const WEEKS_FOR: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

function stripPrefix(text: string): string {
  return (
    text
      .replace(/^(strong |proven |demonstrated |advanced |solid )?(experience (with|in|building|using)|proficiency (in|with)|knowledge of|familiarity with)\s+/i, "")
      .trim() || text
  );
}

/**
 * The no-model plan. Deterministic and less tailored than the model's, but
 * still a real sequence with an artifact and a finish line per block -
 * never a list of topics.
 */
export function fallbackBlocks(gaps: GapPriority[], targetRole: string, hoursPerWeek: number): SprintBlock[] {
  const ordered = [...gaps]
    .filter((g) => g.impact !== "LOW" || gaps.length <= 3)
    .sort((a, b) => {
      const s = (SEQUENCE[a.gapType] ?? 9) - (SEQUENCE[b.gapType] ?? 9);
      if (s !== 0) return s;
      return (IMPACT_ORDER[a.impact] ?? 1) - (IMPACT_ORDER[b.impact] ?? 1);
    })
    .slice(0, 6);

  const blocks: SprintBlock[] = [];
  let week = 1;
  for (const gap of ordered) {
    const subject = stripPrefix(gap.title);
    const length = WEEKS_FOR[gap.difficulty] ?? 2;
    if (week + length - 1 > MAX_PLAN_WEEKS) break;
    let block: Omit<SprintBlock, "startWeek" | "endWeek" | "hoursPerWeek" | "readinessAfter">;
    switch (gap.gapType) {
      case "POSITIONING_GAP":
        block = {
          focus: `Reposition your profile toward ${targetRole}`,
          closes: [gap.title],
          actions: [
            `Rewrite your headline to name ${targetRole} and the one skill you are strongest in`,
            "Rewrite your summary in 3 sentences: what you do, proof with a number, what you want next",
            "Reorder your experience bullets so the most relevant work comes first",
          ],
          deliverable: "An updated headline, summary and top bullets on your Work-ly profile and LinkedIn",
          doneWhen: `Someone reading only your headline and summary would guess you are applying for ${targetRole} roles`,
          resource: null,
        };
        break;
      case "EVIDENCE_GAP":
        block = {
          focus: "Turn stated skills into proof",
          closes: [gap.title],
          actions: [
            "List every skill this role needs that you only name in your skills list",
            "For each, write one bullet under a real role or project: what you did, with what, and the result",
            "Add a number to every bullet you can honestly substantiate",
          ],
          deliverable: "Rewritten experience bullets that show each key skill in use",
          doneWhen: "Every key skill for this role appears in at least one role or project description, not only the skills list",
          resource: null,
        };
        break;
      case "CREDENTIAL_GAP":
        block = {
          focus: `Start the credential: ${subject}`,
          closes: [gap.title],
          actions: [
            `Confirm exactly which credential satisfies "${subject}" in 3 real postings`,
            "Book the exam or enrol, and set a date",
            "Add it to your profile as 'in progress' with the expected completion date",
          ],
          deliverable: "An enrolment or exam booking, listed on your profile",
          doneWhen: "You have a confirmed date and it is visible on your profile",
          resource: null,
        };
        break;
      case "EXPERIENCE_GAP":
      case "SENIORITY_GAP":
        block = {
          focus: `Build scope that counts: ${subject}`,
          closes: [gap.title],
          actions: [
            "Take ownership of one piece of work at your current job (or a volunteer/freelance project) that matches this requirement",
            "Agree a measurable outcome with whoever you work for",
            "Write it up as a bullet with the result once it lands",
          ],
          deliverable: "One owned piece of work, written up with its outcome",
          doneWhen: "You can describe it in an interview as 'I owned X and the result was Y'",
          resource: null,
        };
        break;
      default:
        block = {
          focus: `Get provable in ${subject}`,
          closes: [gap.title],
          actions: [
            `Finish one focused course or tutorial on ${subject} (skip anything over ~10 hours)`,
            `Build a small project that uses ${subject} on a realistic ${targetRole} problem`,
            "Publish it (GitHub, portfolio or a write-up) and add it to your profile with the outcome in one line",
          ],
          deliverable: `A public project that uses ${subject}`,
          doneWhen: `You can link to working ${subject} work and explain one decision you made in it`,
          resource: null,
        };
    }
    blocks.push({ ...block, startWeek: week, endWeek: week + length - 1, hoursPerWeek, readinessAfter: null });
    week += length;
  }
  return blocks;
}

/** The final block every plan ends with: turning readiness into applications. */
export function applyBlock(afterWeek: number, targetRole: string, hoursPerWeek: number): SprintBlock {
  return {
    startWeek: afterWeek + 1,
    endWeek: afterWeek + 2,
    focus: `Apply to ${targetRole} roles`,
    closes: [],
    actions: [
      `Run Discover for ${targetRole} and shortlist every Strong or Apply Now match`,
      "Tailor your resume per role, leading with the projects from this plan",
      "Send 5 tailored applications a week and message one hiring manager per application",
    ],
    deliverable: "10 tailored applications sent",
    doneWhen: "10 applications are tracked in Work-ly with a tailored resume attached to each",
    resource: null,
    hoursPerWeek,
    readinessAfter: null,
  };
}

function weeksLabel(b: SprintBlock): string {
  return b.startWeek === b.endWeek ? `Week ${b.startWeek}` : `Weeks ${b.startWeek}–${b.endWeek}`;
}

export function blocksToPlanItems(
  blocks: SprintBlock[],
  gaps: GapPriority[],
  jobTitleFor: (opportunityId: string) => string | null,
): ImprovementPlanItem[] {
  return blocks.map((block) => {
    const closedGaps = gaps.filter((g) => block.closes.includes(g.title));
    const tier = closedGaps.some((g) => g.impact === "HIGH")
      ? "HIGH"
      : closedGaps.some((g) => g.impact === "MEDIUM")
        ? "MEDIUM"
        : block.closes.length === 0
          ? "MEDIUM"
          : "LOW";
    const weeks = block.endWeek - block.startWeek + 1;
    const relevantJobs = Array.from(
      new Set(closedGaps.flatMap((g) => g.affectedOpportunityIds).map(jobTitleFor).filter((t): t is string => Boolean(t))),
    ).slice(0, 5);
    return {
      tier,
      title: `${weeksLabel(block)}: ${block.focus}`,
      why: block.actions.join(" · "),
      impact:
        (block.closes.length > 0 ? `Makes provable: ${block.closes.join("; ")}.` : "Turns your readiness into interviews.") +
        (block.readinessAfter != null ? ` Readiness after this block: about ${block.readinessAfter}/100.` : ""),
      effort: `${weeks} week${weeks === 1 ? "" : "s"} at about ${block.hoursPerWeek} hours a week. Deliverable: ${block.deliverable}.${
        block.resource ? ` Suggested resource: ${block.resource}.` : ""
      }`,
      relevantJobs,
      block,
    } satisfies ImprovementPlanItem;
  });
}

export { weeksLabel };
