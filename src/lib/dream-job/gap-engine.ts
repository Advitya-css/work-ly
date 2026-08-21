import "server-only";

import type {
  CvImprovement,
  GapDifficulty,
  GapImpact,
  GapPriority,
  GapType,
  ImprovementPlanItem,
  Job,
  KeepItem,
  OpportunityWithJob,
  ProjectRecommendation,
  Skill,
} from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";
import type { JobFitAnalysis } from "@/lib/scoring/types";
import { normalize, skillsMatch } from "@/lib/scoring/shared";

// ---------------------------------------------------------------------------
// Difficulty / time estimation - deterministic keyword classification, never
// a fabricated number. These are estimates (like Fit/Priority scores
// elsewhere), presented as such, not claims about the user.
// ---------------------------------------------------------------------------

const HIGH_DIFFICULTY_SKILL_KEYWORDS = [
  "cloud", "aws", "azure", "gcp", "kubernetes", "docker", "terraform", "devops",
  "machine learning", "deep learning", "distributed systems", "security", "infrastructure",
  "ci cd", "microservices", "data engineering", "system design",
];
const LOW_DIFFICULTY_SKILL_KEYWORDS = [
  "communication", "leadership", "presentation", "collaboration", "stakeholder",
  "mentoring", "time management", "organization", "teamwork", "writing",
];

function estimateSkillDifficulty(skillName: string): { difficulty: GapDifficulty; estimatedTime: string } {
  const n = normalize(skillName);
  if (HIGH_DIFFICULTY_SKILL_KEYWORDS.some((k) => n.includes(k))) {
    return { difficulty: "HIGH", estimatedTime: "3–4 weeks of focused, hands-on practice" };
  }
  if (LOW_DIFFICULTY_SKILL_KEYWORDS.some((k) => n.includes(k))) {
    return { difficulty: "LOW", estimatedTime: "Ongoing. Demonstrate it in your next few work samples" };
  }
  return { difficulty: "MEDIUM", estimatedTime: "2–3 weeks of focused practice or a small project" };
}

const NON_SKILL_GAP_ESTIMATES: Record<Exclude<GapType, "SKILL_GAP">, { difficulty: GapDifficulty; estimatedTime: string }> = {
  EXPERIENCE_GAP: { difficulty: "HIGH", estimatedTime: "Primarily a matter of time. A strong project can partially offset it" },
  EVIDENCE_GAP: { difficulty: "LOW", estimatedTime: "1–2 weeks to document existing work with concrete outcomes" },
  PORTFOLIO_GAP: { difficulty: "MEDIUM", estimatedTime: "2–4 weeks to build and publish one strong project" },
  CREDENTIAL_GAP: { difficulty: "HIGH", estimatedTime: "Several weeks to months, depending on the credential" },
  SENIORITY_GAP: { difficulty: "HIGH", estimatedTime: "Typically 1–2 years of demonstrated scope growth" },
  POSITIONING_GAP: { difficulty: "LOW", estimatedTime: "Under a week. This is a rewrite, not new work" },
};

// ---------------------------------------------------------------------------
// Gap prioritization - ranked, grounded in the user's real tracked
// Opportunities (never a flat dump of missing skills).
// ---------------------------------------------------------------------------

function skillAppearsIn(skillName: string, job: Job): boolean {
  return [...job.requiredSkills, ...job.preferredSkills].some((reqSkill) => skillsMatch(skillName, reqSkill));
}

function buildSkillGapPriorities(
  dreamJobLike: Job,
  profile: FullCareerProfile,
  opportunities: OpportunityWithJob[],
): GapPriority[] {
  const confirmed = profile.skills.filter((s) => !s.isTransferable);
  const priorities: GapPriority[] = [];

  for (const skillName of dreamJobLike.requiredSkills) {
    if (confirmed.some((s) => skillsMatch(s.name, skillName))) continue;
    const affected = opportunities.filter((o) => skillAppearsIn(skillName, o.job));
    const { difficulty, estimatedTime } = estimateSkillDifficulty(skillName);
    priorities.push({
      gapType: "SKILL_GAP",
      title: skillName,
      description: `Required for this dream role, not currently on your profile.${affected.length > 0 ? ` Also appears in ${affected.length} of your tracked opportunities.` : ""}`,
      impact: affected.length >= 3 ? "HIGH" : "MEDIUM",
      difficulty,
      estimatedTime,
      affectedOpportunityCount: affected.length,
      affectedOpportunityIds: affected.map((o) => o.id),
    });
  }

  for (const skillName of dreamJobLike.preferredSkills) {
    if (confirmed.some((s) => skillsMatch(s.name, skillName))) continue;
    if (dreamJobLike.requiredSkills.some((r) => skillsMatch(skillName, r))) continue;
    const affected = opportunities.filter((o) => skillAppearsIn(skillName, o.job));
    const { difficulty, estimatedTime } = estimateSkillDifficulty(skillName);
    priorities.push({
      gapType: "SKILL_GAP",
      title: skillName,
      description: `Preferred (not required) for this dream role.${affected.length > 0 ? ` Also appears in ${affected.length} of your tracked opportunities.` : ""}`,
      impact: affected.length >= 3 ? "MEDIUM" : "LOW",
      difficulty,
      estimatedTime,
      affectedOpportunityCount: affected.length,
      affectedOpportunityIds: affected.map((o) => o.id),
    });
  }

  return priorities;
}

function buildNonSkillGapPriorities(
  fit: JobFitAnalysis,
  opportunities: OpportunityWithJob[],
): GapPriority[] {
  return fit.gaps
    .filter((g) => g.type !== "SKILL_GAP")
    .map((g) => {
      const affected = opportunities.filter((o) => o.analysis?.gaps.some((og) => og.type === g.type));
      const estimate = NON_SKILL_GAP_ESTIMATES[g.type as Exclude<GapType, "SKILL_GAP">];
      const impact: GapImpact = affected.length >= 3 ? "HIGH" : affected.length >= 1 ? "MEDIUM" : "LOW";
      return {
        gapType: g.type,
        title: g.title,
        description: `${g.description}${affected.length > 0 ? ` This also shows up on ${affected.length} of your tracked opportunities.` : ""}`,
        impact,
        difficulty: estimate.difficulty,
        estimatedTime: estimate.estimatedTime,
        affectedOpportunityCount: affected.length,
        affectedOpportunityIds: affected.map((o) => o.id),
      } satisfies GapPriority;
    });
}

const IMPACT_RANK: Record<GapImpact, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function rankGapPriorities(priorities: GapPriority[]): GapPriority[] {
  return [...priorities].sort((a, b) => {
    if (IMPACT_RANK[a.impact] !== IMPACT_RANK[b.impact]) return IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact];
    return b.affectedOpportunityCount - a.affectedOpportunityCount;
  });
}

// ---------------------------------------------------------------------------
// CV improvements - every suggestion traces to real profile/job text, never
// fabricated. Uses the exact required phrasing for unsubstantiated metrics.
// ---------------------------------------------------------------------------

const GENERIC_PHRASES = [
  "team player", "hard worker", "detail oriented", "detail-oriented", "results driven", "results-driven",
  "go getter", "go-getter", "self starter", "self-starter", "responsible for", "hardworking", "dynamic professional",
];

function hasDigit(text: string): boolean {
  return /\d/.test(text);
}

function buildCvImprovements(dreamJobLike: Job, profile: FullCareerProfile, fit: JobFitAnalysis): CvImprovement[] {
  const improvements: CvImprovement[] = [];

  if (!profile.profile?.headline) {
    improvements.push({
      area: "missing_information",
      issue: "Your profile doesn't have a headline.",
      suggestion: `Add a one-line headline reflecting your target role (e.g. "${dreamJobLike.title ?? "your dream role title"}").`,
    });
  }
  if (!profile.profile?.summary) {
    improvements.push({
      area: "missing_information",
      issue: "Your profile doesn't have a summary.",
      suggestion: "Add a 2–3 sentence summary tying your background directly to the kind of role you're targeting.",
    });
  }

  const confirmed = profile.skills.filter((s) => !s.isTransferable);
  const weaklyEvidenced = [...dreamJobLike.requiredSkills, ...dreamJobLike.preferredSkills]
    .map((name) => confirmed.find((s) => skillsMatch(s.name, name)))
    .filter((s): s is Skill => s != null && (s.evidenceLevel === "STATED" || s.evidenceLevel === "INFERRED"));
  const uniqueWeak = Array.from(new Map(weaklyEvidenced.map((s) => [s.id, s])).values());
  if (uniqueWeak.length > 0) {
    improvements.push({
      area: "weak_evidence",
      issue: `${uniqueWeak.length} skill${uniqueWeak.length === 1 ? "" : "s"} relevant to this role (${uniqueWeak.slice(0, 4).map((s) => s.name).join(", ")}) are self-stated rather than backed by a project or certification.`,
      suggestion: "Link each of these skills to a specific project, outcome, or credential rather than listing it alone.",
    });
  }

  const genericExperiences = profile.experiences.filter((e) =>
    e.description && GENERIC_PHRASES.some((p) => normalize(e.description!).includes(p)),
  );
  if (genericExperiences.length > 0) {
    improvements.push({
      area: "generic_language",
      issue: `${genericExperiences.length} experience entr${genericExperiences.length === 1 ? "y uses" : "ies use"} generic phrasing (e.g. "responsible for", "team player") instead of specifics.`,
      suggestion: "Replace generic phrases with what you actually did and the concrete result. A specific action beats a general trait every time.",
    });
  }

  const unquantified = profile.experiences.filter((e) => e.description && e.description.trim().length > 0 && !hasDigit(e.description));
  if (unquantified.length > 0) {
    improvements.push({
      area: "unquantified_achievements",
      issue: `${unquantified.length} experience entr${unquantified.length === 1 ? "y has" : "ies have"} no numbers. Scope, scale, or outcome isn't quantified.`,
      suggestion: "Add a metric if you can substantiate one. Team size, percentage improvement, time saved, revenue, users, anything concrete.",
    });
  }

  if (dreamJobLike.industry) {
    const haystack = [
      profile.profile?.headline,
      profile.profile?.summary,
      ...profile.experiences.map((e) => `${e.company} ${e.title} ${e.description ?? ""}`),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(dreamJobLike.industry.toLowerCase())) {
      improvements.push({
        area: "missing_experience",
        issue: `Nothing on your profile is clearly tied to ${dreamJobLike.industry}.`,
        suggestion: `If you have any adjacent experience, make the ${dreamJobLike.industry} connection explicit in your summary or an experience description. Don't leave the reader to infer it.`,
      });
    }
  }

  // Poor ordering: is the experience most relevant to this dream role buried
  // instead of leading? A real, checkable signal - keyword overlap against
  // the dream job's own requirement text, not a guess.
  if (profile.experiences.length > 1) {
    const reqWords = normalize([dreamJobLike.title ?? "", ...dreamJobLike.requiredSkills].join(" "))
      .split(" ")
      .filter((w) => w.length > 3);
    const overlapScore = (text: string) => {
      const n = normalize(text);
      return reqWords.filter((w) => n.includes(w)).length;
    };
    const scored = profile.experiences.map((e) => ({ e, score: overlapScore(`${e.title} ${e.description ?? ""}`) }));
    const topByRelevance = scored.reduce((best, cur) => (cur.score > best.score ? cur : best), scored[0]);
    const currentFirst = profile.experiences[0];
    if (topByRelevance.score > 0 && topByRelevance.e.id !== currentFirst.id) {
      improvements.push({
        area: "poor_ordering",
        issue: `Your ${topByRelevance.e.title} experience at ${topByRelevance.e.company} is your strongest match for this role, but it isn't the first thing a reviewer sees.`,
        suggestion: "For applications toward this kind of role, lead with (or prominently reference) this experience rather than leaving it further down.",
      });
    }
  }

  if (improvements.length === 0 && fit.improvements.length > 0) {
    improvements.push({
      area: "weak_evidence",
      issue: "Your profile is already reasonably well-aligned with this dream role.",
      suggestion: fit.improvements[0],
    });
  }

  return improvements;
}

// ---------------------------------------------------------------------------
// What not to change - the strong parts, so recommendations don't read as
// "everything is wrong."
// ---------------------------------------------------------------------------

const KEEP_STOPWORDS = new Set([
  "a", "an", "the", "of", "or", "and", "with", "in", "on", "to", "for", "your", "you", "years", "year",
  "experience", "skills", "skill", "strong", "proven", "demonstrated", "ability", "excellent", "good",
  "solid", "working", "knowledge", "background", "familiarity",
]);

function findSupportingProject(requirementText: string, projects: FullCareerProfile["projects"]) {
  const words = normalize(requirementText)
    .split(" ")
    .filter((w) => w.length > 3 && !KEEP_STOPWORDS.has(w));
  if (words.length === 0) return undefined;
  return projects.find((p) => {
    const haystack = normalize(`${p.name} ${p.description ?? ""}`);
    if (!haystack.trim()) return false;
    const matched = words.filter((w) => haystack.includes(w));
    return matched.length >= Math.min(2, words.length) && matched.length / words.length >= 0.5;
  });
}

function buildKeepAsIs(dreamJobLike: Job, profile: FullCareerProfile, fit: JobFitAnalysis): KeepItem[] {
  const keep: KeepItem[] = [];

  for (const req of [...fit.mandatoryRequirements, ...fit.preferredRequirements]) {
    // Only a verified "met" is evidence worth keeping. An unknown is
    // not a pass, and treating it as one would invent a strength.
    if (req.status !== "met") continue;
    const project = findSupportingProject(req.text, profile.projects);
    if (project) {
      keep.push({
        title: `Keep your "${project.name}" project`,
        reason: `It provides strong evidence for: ${req.text}.`,
      });
    }
  }

  const confirmed = profile.skills.filter((s) => !s.isTransferable);
  const strongMatches = [...dreamJobLike.requiredSkills, ...dreamJobLike.preferredSkills]
    .map((name) => confirmed.find((s) => skillsMatch(s.name, name)))
    .filter((s): s is Skill => s != null && (s.evidenceLevel === "DEMONSTRATED" || s.evidenceLevel === "CERTIFIED"));
  const uniqueStrong = Array.from(new Map(strongMatches.map((s) => [s.id, s])).values());
  if (uniqueStrong.length > 0) {
    keep.push({
      title: `Keep your evidence for ${uniqueStrong.slice(0, 4).map((s) => s.name).join(", ")}`,
      reason: "These are already backed by demonstrated work or a certification, not just stated: don't dilute them.",
    });
  }

  if (fit.strengths.length > 0) {
    keep.push({ title: "Keep leaning on your core strengths", reason: fit.strengths[0] });
  }

  // Dedupe by title, cap to a reasonable number.
  const seen = new Set<string>();
  return keep.filter((k) => (seen.has(k.title) ? false : (seen.add(k.title), true))).slice(0, 6);
}

// ---------------------------------------------------------------------------
// Improvement plan - HIGH/MEDIUM/LOW tiers, every item explains why/impact/
// effort/relevant jobs, never a flat list.
// ---------------------------------------------------------------------------

function buildImprovementPlan(
  gapPriorities: GapPriority[],
  cvImprovements: CvImprovement[],
  opportunities: OpportunityWithJob[],
): ImprovementPlanItem[] {
  const jobTitleFor = (opportunityId: string) => {
    const o = opportunities.find((op) => op.id === opportunityId);
    return o ? `${o.job.title ?? "Untitled role"}${o.job.company ? ` at ${o.job.company}` : ""}` : null;
  };

  const fromGaps: ImprovementPlanItem[] = gapPriorities.slice(0, 8).map((gap) => ({
    tier: gap.impact,
    title: gap.gapType === "SKILL_GAP" ? `Close the skill gap: ${gap.title}` : gap.title,
    why: gap.description,
    impact:
      gap.affectedOpportunityCount > 0
        ? `Could strengthen your standing on ${gap.affectedOpportunityCount} opportunit${gap.affectedOpportunityCount === 1 ? "y" : "ies"} you're already tracking, plus this dream role.`
        : "Specific to this dream role. Doesn't overlap with your other tracked opportunities yet.",
    effort: `${gap.difficulty === "HIGH" ? "High" : gap.difficulty === "MEDIUM" ? "Medium" : "Low"} effort, ${gap.estimatedTime}.`,
    relevantJobs: gap.affectedOpportunityIds.map(jobTitleFor).filter((t): t is string => Boolean(t)).slice(0, 5),
  }));

  const fromCv: ImprovementPlanItem[] = cvImprovements.slice(0, 4).map((imp) => ({
    tier: imp.area === "missing_information" || imp.area === "missing_experience" ? "MEDIUM" : "LOW",
    title: imp.issue,
    why: "A stronger CV changes how every application. Not just this dream role ,  reads.",
    impact: "Improves how competitive every application looks, not just this one.",
    effort: "Low effort: this is editing, not new work.",
    relevantJobs: [],
  }));

  return [...fromGaps, ...fromCv].sort((a, b) => IMPACT_RANK[a.tier as GapImpact] - IMPACT_RANK[b.tier as GapImpact]);
}

// ---------------------------------------------------------------------------
// Project recommendations - templated by gap category, generic fallback.
// ---------------------------------------------------------------------------

// The heuristic parser (no AI call) often extracts a whole requirement
// clause as one "skill" string (e.g. "Experience with Kubernetes and
// Docker") rather than an atomic name. Stripping a leading throat-clearing
// prefix only for display in a project title reads more naturally, without
// changing the underlying gap title/description used for traceability
// elsewhere on the page.
function skillLabelForProjectTitle(skillName: string): string {
  return skillName.replace(/^(strong |proven |demonstrated )?(experience (with|in|building)|proficiency in|knowledge of)\s+/i, "").trim() || skillName;
}

function projectTemplateFor(skillName: string): { project: string; deliverables: string[]; skillsDemonstrated: string[] } {
  const label = skillLabelForProjectTitle(skillName);
  const n = normalize(skillName);
  if (["cloud", "aws", "azure", "gcp", "kubernetes", "docker", "terraform", "devops", "ci cd"].some((k) => n.includes(k))) {
    return {
      project: `Deploy a small full-stack app using ${label}`,
      deliverables: ["A live, publicly accessible deployment", "A README documenting the deployment pipeline", "A short write-up of the architecture and trade-offs"],
      skillsDemonstrated: [skillName, "Deployment", "Infrastructure basics"],
    };
  }
  if (["machine learning", "deep learning", "data science", "data engineering", "python", "sql"].some((k) => n.includes(k))) {
    return {
      project: `Build an end-to-end data project using ${label}`,
      deliverables: ["A working notebook or repo with clean, documented code", "A short report on the approach and results", "A public repo link for your portfolio"],
      skillsDemonstrated: [skillName, "Data analysis", "Technical communication"],
    };
  }
  return {
    project: `Build and ship a small project demonstrating ${label}`,
    deliverables: ["A working, publicly shared deliverable", "A short write-up of what it does and why", "A portfolio entry with screenshots or a demo link"],
    skillsDemonstrated: [skillName],
  };
}

function buildProjectRecommendations(
  gapPriorities: GapPriority[],
  opportunities: OpportunityWithJob[],
): ProjectRecommendation[] {
  const jobTitleFor = (opportunityId: string) => {
    const o = opportunities.find((op) => op.id === opportunityId);
    return o ? `${o.job.title ?? "Untitled role"}${o.job.company ? ` at ${o.job.company}` : ""}` : null;
  };

  const candidates = gapPriorities.filter(
    (g) => (g.gapType === "SKILL_GAP" || g.gapType === "PORTFOLIO_GAP") && g.impact !== "LOW",
  );

  return candidates.slice(0, 3).map((gap) => {
    const template = projectTemplateFor(gap.title);
    return {
      project: template.project,
      why: `Closes: ${gap.title}. ${gap.description}`,
      skillsDemonstrated: template.skillsDemonstrated,
      deliverables: template.deliverables,
      difficulty: gap.difficulty,
      estimatedTime: gap.estimatedTime,
      relevantTargetJobs: gap.affectedOpportunityIds.map(jobTitleFor).filter((t): t is string => Boolean(t)).slice(0, 5),
      portfolioPresentation: "Add this as a portfolio entry with a live link/demo, a short write-up of the problem and approach, and the specific skill it demonstrates called out explicitly.",
    } satisfies ProjectRecommendation;
  });
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export interface GapAnalysisResult {
  gapPriorities: GapPriority[];
  cvImprovements: CvImprovement[];
  keepAsIs: KeepItem[];
  improvementPlan: ImprovementPlanItem[];
  projectRecommendations: ProjectRecommendation[];
  biggestObstacles: string[];
  highestImpactNextStep: string;
}

export function buildGapAnalysis(params: {
  dreamJobLike: Job;
  fit: JobFitAnalysis;
  profile: FullCareerProfile;
  opportunities: OpportunityWithJob[];
}): GapAnalysisResult {
  const { dreamJobLike, fit, profile, opportunities } = params;

  const skillGaps = buildSkillGapPriorities(dreamJobLike, profile, opportunities);
  const nonSkillGaps = buildNonSkillGapPriorities(fit, opportunities);
  const gapPriorities = rankGapPriorities([...skillGaps, ...nonSkillGaps]);

  const cvImprovements = buildCvImprovements(dreamJobLike, profile, fit);
  const keepAsIs = buildKeepAsIs(dreamJobLike, profile, fit);
  const improvementPlan = buildImprovementPlan(gapPriorities, cvImprovements, opportunities);
  const projectRecommendations = buildProjectRecommendations(gapPriorities, opportunities);

  const biggestObstacles =
    gapPriorities.length > 0
      ? gapPriorities.slice(0, 3).map((g) => (g.gapType === "SKILL_GAP" ? `Missing: ${g.title}` : g.title))
      : ["No significant obstacles identified. Your profile already lines up well with this dream role."];

  const topGap = gapPriorities[0];
  const topProject = projectRecommendations[0];
  const highestImpactNextStep = topGap
    ? topProject
      ? `${topProject.project}. ${topProject.why}`
      : `Focus on: ${topGap.title}. ${topGap.description}`
    : `Your profile is already well-positioned for ${dreamJobLike.title ?? "this dream role"}. A tailored application is the main lever left.`;

  return { gapPriorities, cvImprovements, keepAsIs, improvementPlan, projectRecommendations, biggestObstacles, highestImpactNextStep };
}
