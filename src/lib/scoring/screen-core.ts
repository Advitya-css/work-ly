import type {
  GapItem,
  Job,
  RecommendationType,
  RequirementCheck,
  ScoreBreakdown,
  ScoreComponent,
  SeniorityLevel,
  Skill,
} from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";
import type {
  JobFitAnalysis,
  RequirementImportance,
  RequirementVerdict,
  RoleRelevance,
  ScreenResult,
  ScreenedRequirement,
} from "@/lib/scoring/types";
import { component, unavailable, totalFrom, seniorityIndex, SENIORITY_ORDER } from "@/lib/scoring/shared";
import { WEIGHTS, buildRecommendation } from "@/lib/scoring/providers/stub";

/**
 * THE SCREEN - pure half.
 *
 * Everything here is deterministic and does no I/O, so it can be tested
 * without a model and re-run for "what if you closed these gaps" without
 * another AI call. The model (see ai-evaluator.ts) only ever supplies
 * VERDICTS with quoted evidence. It never supplies a number. Every number
 * the user sees is computed in this file from verdicts that survived
 * grounding - so the score is exactly as trustworthy as the evidence shown
 * next to it, and a reader can re-derive it by hand.
 *
 * Why this exists: the rules engine matches skill NAMES. It cannot tell
 * that "built our Looker dashboards and the dbt models behind them" is
 * strong evidence for "Analytics engineering experience", or that ten
 * years in retail management does not satisfy "3+ years of data analysis"
 * just because 10 > 3. A recruiter reading the CV can. The model does the
 * reading; this file keeps it honest.
 */

// ---------------------------------------------------------------------------
// Candidate dossier - the only text the model may cite as evidence
// ---------------------------------------------------------------------------

export interface DossierEntry {
  /** Short citation label, e.g. "E1", "P2", "SK". */
  label: string;
  /** Plain-language location shown to the user, e.g. "Data Analyst at Acme". */
  where: string;
  kind: "summary" | "experience" | "project" | "achievement" | "education" | "certification" | "skills";
  text: string;
}

function fmtMonth(d: Date | null | undefined): string | null {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function durationLabel(start: Date | null, end: Date | null, isCurrent: boolean): string {
  if (!start) return "";
  const s = new Date(start).getTime();
  const e = isCurrent || !end ? Date.now() : new Date(end).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return "";
  const years = (e - s) / (1000 * 60 * 60 * 24 * 365.25);
  return years >= 1 ? `, ${years.toFixed(1)} yrs` : `, ${Math.max(1, Math.round(years * 12))} mo`;
}

const MAX_ENTRY_CHARS = 1400;
const MAX_DOSSIER_CHARS = 11000;

export function buildDossier(profile: FullCareerProfile): DossierEntry[] {
  const entries: DossierEntry[] = [];
  const clip = (t: string) => (t.length > MAX_ENTRY_CHARS ? `${t.slice(0, MAX_ENTRY_CHARS)}…` : t);

  const summaryText = [
    profile.profile?.headline,
    profile.profile?.currentRole
      ? `Current role: ${profile.profile.currentRole}${profile.profile.currentCompany ? ` at ${profile.profile.currentCompany}` : ""}`
      : null,
    profile.profile?.yearsExperience != null ? `Years of experience (self-reported): ${profile.profile.yearsExperience}` : null,
    profile.profile?.location ? `Based in: ${profile.profile.location}` : null,
    profile.profile?.summary,
  ]
    .filter(Boolean)
    .join("\n");
  if (summaryText.trim()) entries.push({ label: "SUM", where: "your profile summary", kind: "summary", text: clip(summaryText) });

  profile.experiences.forEach((e, i) => {
    const dates = [fmtMonth(e.startDate), e.isCurrent ? "present" : fmtMonth(e.endDate)].filter(Boolean).join(" – ");
    const header = `${e.title} at ${e.company}${dates ? ` (${dates}${durationLabel(e.startDate, e.endDate, e.isCurrent)})` : ""}`;
    entries.push({
      label: `E${i + 1}`,
      where: `${e.title} at ${e.company}`,
      kind: "experience",
      text: clip(`${header}\n${e.description ?? ""}`.trim()),
    });
  });

  profile.projects.forEach((p, i) => {
    entries.push({
      label: `P${i + 1}`,
      where: `your "${p.name}" project`,
      kind: "project",
      text: clip(`${p.name}${p.role ? ` (${p.role})` : ""}\n${p.description ?? ""}`.trim()),
    });
  });

  profile.achievements.forEach((a, i) => {
    entries.push({
      label: `A${i + 1}`,
      where: `your "${a.title}" achievement`,
      kind: "achievement",
      text: clip(`${a.title}\n${a.description ?? ""}`.trim()),
    });
  });

  profile.educations.forEach((ed, i) => {
    const text = [ed.degree, ed.fieldOfStudy, ed.institution, [fmtMonth(ed.startDate), fmtMonth(ed.endDate)].filter(Boolean).join(" – "), ed.description]
      .filter(Boolean)
      .join(", ");
    entries.push({ label: `ED${i + 1}`, where: `your ${ed.degree ?? "education"} at ${ed.institution}`, kind: "education", text: clip(text) });
  });

  profile.certifications.forEach((c, i) => {
    const text = [c.name, c.issuer, fmtMonth(c.issueDate)].filter(Boolean).join(", ");
    entries.push({ label: `C${i + 1}`, where: `your ${c.name} certification`, kind: "certification", text });
  });

  const skills = profile.skills.filter((s) => !s.isTransferable);
  if (skills.length > 0) {
    entries.push({
      label: "SK",
      where: "your skills list",
      kind: "skills",
      text: skills.map((s) => `${s.name} [${s.evidenceLevel.toLowerCase()}]`).join(", "),
    });
  }

  // Keep the whole dossier inside a sane prompt budget, trimming the
  // oldest experience descriptions first (the header line with title and
  // dates is always kept - it's the most decision-relevant part).
  let total = entries.reduce((n, e) => n + e.text.length, 0);
  for (let i = entries.length - 1; i >= 0 && total > MAX_DOSSIER_CHARS; i--) {
    const entry = entries[i];
    if (entry.kind !== "experience" && entry.kind !== "project") continue;
    const firstLine = entry.text.split("\n")[0];
    total -= entry.text.length - firstLine.length;
    entry.text = firstLine;
  }
  return entries;
}

export function renderDossier(entries: DossierEntry[]): string {
  return entries.map((e) => `[${e.label}] ${e.text}`).join("\n\n");
}

/** True when there is enough on the profile for a screen to mean anything. */
export function dossierIsUsable(profile: FullCareerProfile): boolean {
  const hasWork = profile.experiences.length > 0 || profile.projects.length > 0;
  const hasSkills = profile.skills.some((s) => !s.isTransferable);
  const hasSummary = Boolean(profile.profile?.headline || profile.profile?.summary);
  return hasWork || (hasSkills && hasSummary);
}

// ---------------------------------------------------------------------------
// Grounding - a quote either exists in the source text or it does not
// ---------------------------------------------------------------------------

export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Whether `quote` genuinely appears in `source`.
 *
 * Exact containment after normalization first. Models trim or lightly
 * re-punctuate quotes, so a fallback accepts a quote when at least 85% of
 * its meaningful words appear in the source AND at least three of them do -
 * tolerant of "and"/"&" drift, not of an invented sentence.
 */
export function quoteFound(quote: string | null | undefined, source: string): boolean {
  if (!quote) return false;
  const q = normalizeForMatch(quote);
  if (q.length < 3) return false;
  const src = normalizeForMatch(source);
  if (src.includes(q)) return true;
  const srcTokens = new Set(src.split(" "));
  const qTokens = q.split(" ").filter((t) => t.length > 2);
  if (qTokens.length < 3) return false;
  const hit = qTokens.filter((t) => srcTokens.has(t)).length;
  return hit / qTokens.length >= 0.85;
}

// ---------------------------------------------------------------------------
// Raw model output -> grounded ScreenResult
// ---------------------------------------------------------------------------

export interface RawScreen {
  summary?: unknown;
  roleRelevance?: unknown;
  relevanceRationale?: unknown;
  candidateLevel?: unknown;
  roleLevel?: unknown;
  requirements?: unknown;
  strengths?: unknown;
}

export interface GroundedScreen extends ScreenResult {
  candidateLevel: SeniorityLevel | null;
  roleLevel: SeniorityLevel | null;
  strengths: { point: string; evidenceQuote: string; evidenceWhere: string }[];
  /** Labels of the dossier entries each requirement's evidence came from (parallel to requirements). */
  evidenceKinds: (DossierEntry["kind"] | null)[];
}

const IMPORTANCE: RequirementImportance[] = ["critical", "important", "nice"];
const VERDICTS: RequirementVerdict[] = ["met", "partial", "missing", "unclear"];
const RELEVANCE: RoleRelevance[] = ["same_role", "adjacent", "transferable", "unrelated"];
const CATEGORIES = ["skill", "experience", "education", "credential", "other"] as const;

function asString(v: unknown, max = 400): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}
function asEnum<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}
function asLevel(v: unknown): SeniorityLevel | null {
  return asEnum(v, SENIORITY_ORDER as unknown as SeniorityLevel[]);
}

function findSkillInQuote(quote: string, skills: Skill[]): Skill | undefined {
  const q = normalizeForMatch(quote);
  return skills
    .filter((s) => q.includes(normalizeForMatch(s.name)))
    .sort((a, b) => b.name.length - a.name.length)[0];
}

/**
 * Turns whatever the model returned into a ScreenResult Work-ly is willing
 * to stand behind:
 *   - a requirement whose quote is not in the posting is dropped (the model
 *     invented a requirement);
 *   - a "met"/"partial" verdict whose evidence is not in the candidate's own
 *     text becomes "unclear" (the model invented a qualification);
 *   - a critical requirement "met" only by a self-stated line in the skills
 *     list is capped at "partial" - listing a word is not doing the work.
 * Returns null when nothing usable survives, so the caller falls back to
 * the rules engine instead of showing an empty screen.
 */
export function groundScreen(
  raw: RawScreen,
  dossier: DossierEntry[],
  postingText: string,
  profile: FullCareerProfile,
): GroundedScreen | null {
  const rawReqs = Array.isArray(raw.requirements) ? raw.requirements.slice(0, 14) : [];
  const requirements: ScreenedRequirement[] = [];
  const evidenceKinds: (DossierEntry["kind"] | null)[] = [];
  let ungroundedDropped = 0;
  const seen = new Set<string>();
  const confirmedSkills = profile.skills.filter((s) => !s.isTransferable);

  for (const item of rawReqs) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const requirement = asString(r.requirement, 160);
    const importance = asEnum(r.importance, IMPORTANCE);
    let verdict = asEnum(r.verdict, VERDICTS);
    const category = asEnum(r.category, CATEGORIES) ?? "other";
    if (!requirement || !importance || !verdict) continue;

    // The requirement itself must come from the posting.
    const postingQuote = asString(r.postingQuote, 300) ?? requirement;
    if (!quoteFound(postingQuote, postingText) && !quoteFound(requirement, postingText)) continue;

    const key = normalizeForMatch(requirement);
    if (seen.has(key)) continue;
    seen.add(key);

    let evidenceQuote = asString(r.evidenceQuote, 220);
    let evidenceWhere: string | null = null;
    let evidenceKind: DossierEntry["kind"] | null = null;

    if (verdict === "met" || verdict === "partial") {
      const ref = asString(r.evidenceRef, 10)?.replace(/[[\]]/g, "") ?? null;
      const byRef = ref ? dossier.find((d) => d.label === ref) : undefined;
      const entry =
        byRef && quoteFound(evidenceQuote, byRef.text) ? byRef : dossier.find((d) => quoteFound(evidenceQuote, d.text));
      if (!entry) {
        verdict = "unclear";
        evidenceQuote = null;
        ungroundedDropped++;
      } else {
        evidenceWhere = entry.where;
        evidenceKind = entry.kind;
        if (entry.kind === "skills" && importance === "critical" && verdict === "met") {
          const skill = findSkillInQuote(evidenceQuote ?? "", confirmedSkills);
          if (!skill || skill.evidenceLevel === "STATED" || skill.evidenceLevel === "INFERRED") verdict = "partial";
        }
      }
    } else {
      evidenceQuote = null;
    }

    requirements.push({
      requirement,
      importance,
      category,
      verdict,
      evidenceQuote,
      evidenceWhere,
      gapToClose: verdict === "met" ? null : asString(r.gapToClose, 220),
    });
    evidenceKinds.push(evidenceKind);
  }

  const assessable = requirements.filter((r) => r.verdict !== "unclear");
  if (requirements.length < 2 || assessable.length === 0) return null;

  const strengths: GroundedScreen["strengths"] = [];
  if (Array.isArray(raw.strengths)) {
    for (const item of raw.strengths.slice(0, 6)) {
      if (!item || typeof item !== "object") continue;
      const s = item as Record<string, unknown>;
      const point = asString(s.point, 200);
      const quote = asString(s.evidenceQuote, 220);
      const entry = quote ? dossier.find((d) => quoteFound(quote, d.text)) : undefined;
      if (point && quote && entry) strengths.push({ point, evidenceQuote: quote, evidenceWhere: entry.where });
    }
  }

  return {
    summary: asString(raw.summary, 400) ?? "",
    roleRelevance: asEnum(raw.roleRelevance, RELEVANCE) ?? "transferable",
    relevanceRationale: asString(raw.relevanceRationale, 300) ?? "",
    requirements,
    dealbreakers: requirements.filter((r) => r.importance === "critical" && r.verdict === "missing").map((r) => r.requirement),
    ungroundedDropped,
    candidateLevel: asLevel(raw.candidateLevel),
    roleLevel: asLevel(raw.roleLevel),
    strengths,
    evidenceKinds,
  };
}

// ---------------------------------------------------------------------------
// Verdicts -> number. Fully deterministic.
// ---------------------------------------------------------------------------

const IMPORTANCE_WEIGHT: Record<RequirementImportance, number> = { critical: 3, important: 2, nice: 1 };
const VERDICT_VALUE: Record<Exclude<RequirementVerdict, "unclear">, number> = { met: 1, partial: 0.5, missing: 0 };
const RELEVANCE_VALUE: Record<RoleRelevance, number> = { same_role: 1, adjacent: 0.75, transferable: 0.45, unrelated: 0.1 };
const RELEVANCE_LABEL: Record<RoleRelevance, string> = {
  same_role: "This is the same kind of role you already do.",
  adjacent: "This is a close neighbour of what you already do.",
  transferable: "This is a different role, reachable through transferable experience.",
  unrelated: "This role is largely unrelated to your background.",
};

function weightedRatio(reqs: ScreenedRequirement[]): { ratio: number; met: number; partial: number; missing: number } | null {
  const scored = reqs.filter((r) => r.verdict !== "unclear");
  if (scored.length === 0) return null;
  let num = 0;
  let den = 0;
  for (const r of scored) {
    const w = IMPORTANCE_WEIGHT[r.importance];
    num += w * VERDICT_VALUE[r.verdict as Exclude<RequirementVerdict, "unclear">];
    den += w;
  }
  return {
    ratio: den > 0 ? num / den : 0,
    met: scored.filter((r) => r.verdict === "met").length,
    partial: scored.filter((r) => r.verdict === "partial").length,
    missing: scored.filter((r) => r.verdict === "missing").length,
  };
}

function groupReasoning(label: string, g: { met: number; partial: number; missing: number }): string {
  const total = g.met + g.partial + g.missing;
  const parts = [`You meet ${g.met} of ${total} ${label} Work-ly could verify against your own profile text`];
  if (g.partial > 0) parts.push(`${g.partial} partly`);
  if (g.missing > 0) parts.push(`${g.missing} not yet`);
  return `${parts.join(", ")}.`;
}

const RANK: Record<RecommendationType, number> = { APPLY_NOW: 4, APPLY: 3, STRETCH: 2, LOW_PRIORITY: 1, SKIP: 0 };
function capRecommendation(rec: RecommendationType, cap: RecommendationType): RecommendationType {
  return RANK[rec] > RANK[cap] ? cap : rec;
}

function toCheck(r: ScreenedRequirement): RequirementCheck {
  if (r.verdict === "met") {
    return { text: r.requirement, status: "met", detail: `Evidence from ${r.evidenceWhere}: "${r.evidenceQuote}"` };
  }
  if (r.verdict === "partial") {
    return {
      text: r.requirement,
      status: "not-met",
      detail: `Partial match (${r.evidenceWhere}: "${r.evidenceQuote}").${r.gapToClose ? ` To close it: ${r.gapToClose}` : ""}`,
    };
  }
  if (r.verdict === "missing") {
    return {
      text: r.requirement,
      status: "not-met",
      detail: `Nothing on your profile shows this yet.${r.gapToClose ? ` To close it: ${r.gapToClose}` : ""}`,
    };
  }
  return { text: r.requirement, status: "unknown", detail: "Your profile doesn't say either way. Check this one yourself." };
}

/**
 * Combines a grounded screen with the rules analysis of the same job into
 * the final JobFitAnalysis.
 *
 * Division of labour, component by component:
 *   skills            SCREEN - requirement verdicts, weighted by importance
 *   experience        SCREEN when it judged experience requirements (it can
 *                     tell relevant years from total years), else RULES
 *   education         SCREEN for education/credential verdicts, else RULES
 *   industryRelevance SCREEN's role-relevance judgement
 *   seniority         RULES when measured, else the screen's level read
 *   location          RULES (structured facts, no reading required)
 *   evidence          share of matches backed by real work, not a skills list
 */
export function combineScreen(params: {
  screen: GroundedScreen;
  rules: JobFitAnalysis;
  job: Job;
  profile: FullCareerProfile;
}): JobFitAnalysis {
  const { screen, rules, job, profile } = params;
  const reqs = screen.requirements;

  const skillsGroup = reqs.filter((r) => r.category === "skill" || r.category === "other");
  const expGroup = reqs.filter((r) => r.category === "experience");
  const eduGroup = reqs.filter((r) => r.category === "education" || r.category === "credential");

  const sg = weightedRatio(skillsGroup);
  const skills: ScoreComponent = sg
    ? component(sg.ratio * WEIGHTS.skills, WEIGHTS.skills, groupReasoning("key requirements", sg))
    : unavailable(WEIGHTS.skills, "Work-ly could not verify this role's skill requirements either way from your profile.");

  const eg = weightedRatio(expGroup);
  const experience: ScoreComponent = eg
    ? component(eg.ratio * WEIGHTS.experience, WEIGHTS.experience, groupReasoning("experience requirements", eg))
    : rules.scoreBreakdown.experience;

  const edg = weightedRatio(eduGroup);
  const education: ScoreComponent = edg
    ? component(edg.ratio * WEIGHTS.education, WEIGHTS.education, groupReasoning("education or credential requirements", edg))
    : rules.scoreBreakdown.education;

  const industryRelevance = component(
    RELEVANCE_VALUE[screen.roleRelevance] * WEIGHTS.industryRelevance,
    WEIGHTS.industryRelevance,
    `${RELEVANCE_LABEL[screen.roleRelevance]}${screen.relevanceRationale ? ` ${screen.relevanceRationale}` : ""}`,
  );

  let seniority = rules.scoreBreakdown.seniority;
  if (seniority.confidence === "unavailable") {
    const roleLevel = job.seniority ?? screen.roleLevel;
    if (screen.candidateLevel && roleLevel) {
      const distance = Math.abs(seniorityIndex(screen.candidateLevel) - seniorityIndex(roleLevel));
      const ratio = Math.max(0, 1 - distance * 0.25);
      seniority = component(
        ratio * WEIGHTS.seniority,
        WEIGHTS.seniority,
        distance === 0
          ? `Your experience reads as ${screen.candidateLevel.toLowerCase()} level, which is what this role asks for.`
          : `Your experience reads as ${screen.candidateLevel.toLowerCase()} level against a ${roleLevel.toLowerCase()} role.`,
      );
    }
  }

  const location = rules.scoreBreakdown.location;

  const backed = reqs
    .map((r, i) => ({ r, kind: screen.evidenceKinds[i] }))
    .filter(({ r }) => r.verdict === "met" || r.verdict === "partial");
  const evidence: ScoreComponent =
    backed.length > 0
      ? (() => {
          const fromWork = backed.filter(({ kind }) => kind && kind !== "skills" && kind !== "summary").length;
          return component(
            (0.5 + 0.5 * (fromWork / backed.length)) * WEIGHTS.evidence,
            WEIGHTS.evidence,
            fromWork === backed.length
              ? "Every requirement you meet is backed by real work (a role, project, achievement or certification)."
              : `${fromWork} of your ${backed.length} matches are backed by real work; the rest rest on your skills list or summary alone.`,
          );
        })()
      : unavailable(WEIGHTS.evidence, "None of this role's requirements were matched, so there is no evidence quality to assess.");

  const scoreBreakdown: ScoreBreakdown = { skills, experience, education, industryRelevance, seniority, location, evidence };
  const total = totalFrom(scoreBreakdown);

  // Caps. A single unmet hard requirement is how most real applications
  // die in a screen, however good the rest looks, so the number must not
  // read as a strong match while one is outstanding.
  const criticalMissing = reqs.filter((r) => r.importance === "critical" && r.verdict === "missing");
  let fitScore = Math.round(total.score ?? total.raw ?? 0);
  const capNotes: string[] = [];
  if (criticalMissing.length >= 2) {
    fitScore = Math.min(fitScore, 45);
    capNotes.push(`capped at 45 because ${criticalMissing.length} must-have requirements are not met`);
  } else if (criticalMissing.length === 1) {
    fitScore = Math.min(fitScore, 64);
    capNotes.push(`capped at 64 until you meet the must-have "${criticalMissing[0].requirement}"`);
  }
  if (screen.roleRelevance === "unrelated") {
    fitScore = Math.min(fitScore, 35);
    capNotes.push("capped at 35 because the role is unrelated to your background");
  } else if (screen.roleRelevance === "transferable") {
    fitScore = Math.min(fitScore, 72);
  }

  const mandatory = reqs.filter((r) => r.importance !== "nice");
  const mandatoryScored = mandatory.filter((r) => r.verdict !== "unclear");
  const mandatoryMetRatio =
    mandatoryScored.length > 0
      ? mandatoryScored.reduce((n, r) => n + VERDICT_VALUE[r.verdict as Exclude<RequirementVerdict, "unclear">], 0) /
        mandatoryScored.length
      : null;

  // --- Gaps ------------------------------------------------------------------
  const byImportance = (a: ScreenedRequirement, b: ScreenedRequirement) =>
    IMPORTANCE_WEIGHT[b.importance] - IMPORTANCE_WEIGHT[a.importance];
  const open = reqs.filter((r) => r.verdict === "missing" || r.verdict === "partial").sort(byImportance);
  const gaps: GapItem[] = rules.gaps.filter(
    (g) =>
      g.type !== "SKILL_GAP" &&
      !(g.type === "EXPERIENCE_GAP" && eg) &&
      !(g.type === "CREDENTIAL_GAP" && edg) &&
      !(g.type === "EVIDENCE_GAP"),
  );
  const openSkills = open.filter((r) => (r.category === "skill" || r.category === "other") && r.importance !== "nice");
  if (openSkills.length > 0) {
    gaps.unshift({
      type: "SKILL_GAP",
      title: `${openSkills.length} key requirement${openSkills.length === 1 ? "" : "s"} not fully met`,
      description: openSkills.slice(0, 6).map((r) => r.requirement).join("; "),
    });
  }
  const openExp = open.filter((r) => r.category === "experience" && r.importance !== "nice");
  if (openExp.length > 0) {
    gaps.push({ type: "EXPERIENCE_GAP", title: "Experience requirement not fully met", description: openExp.map((r) => r.requirement).join("; ") });
  }
  const openEdu = open.filter((r) => (r.category === "education" || r.category === "credential") && r.importance !== "nice");
  if (openEdu.length > 0) {
    gaps.push({ type: "CREDENTIAL_GAP", title: "Education or credential not fully met", description: openEdu.map((r) => r.requirement).join("; ") });
  }
  const weakEvidence = backed.filter(({ kind }) => kind === "skills" || kind === "summary").length;
  if (backed.length > 0 && weakEvidence / backed.length > 0.5) {
    gaps.push({
      type: "EVIDENCE_GAP",
      title: "Matches rest on your skills list, not your work",
      description: "Most requirements you meet are only named in your skills list or summary. Show them in a role, project or result.",
    });
  }

  // --- Recommendation -------------------------------------------------------
  const built = buildRecommendation(
    fitScore,
    total.coverage,
    mandatoryMetRatio,
    mandatoryScored.length,
    gaps,
    screen.roleRelevance === "unrelated",
  );
  let recommendation = built.recommendation;
  let reasoning = screen.summary ? `${screen.summary} ${built.reasoning}` : built.reasoning;
  if (criticalMissing.length > 0) {
    const capped = capRecommendation(recommendation, "STRETCH");
    if (capped !== recommendation) {
      recommendation = capped;
      reasoning += ` Held at Stretch until you can show: ${criticalMissing.map((r) => r.requirement).join("; ")}.`;
    }
  }
  // Keep the rules engine's student/part-time downgrade - it is based on a
  // fact the student stated, not on reading.
  if (profile.profile?.isStudent && profile.profile.isPartTimeMode && job.employmentType === "FULL_TIME") {
    recommendation = capRecommendation(recommendation, "STRETCH");
  }
  if (capNotes.length > 0) reasoning += ` (Score ${capNotes.join("; ")}.)`;

  const competitiveness: JobFitAnalysis["competitiveness"] =
    total.score == null ? "Insufficient data" : fitScore >= 75 ? "High" : fitScore >= 50 ? "Moderate" : "Low";

  // --- Strengths, risks, improvements ----------------------------------------
  const strengths = screen.strengths.map((s) => `${s.point} (${s.evidenceWhere}: "${s.evidenceQuote}")`);
  if (strengths.length === 0) {
    const metCritical = reqs.filter((r) => r.verdict === "met" && r.importance !== "nice").slice(0, 3);
    for (const r of metCritical) strengths.push(`${r.requirement} (${r.evidenceWhere}: "${r.evidenceQuote}")`);
  }

  const risks: string[] = [];
  for (const r of criticalMissing) {
    risks.push(`Must-have not shown on your profile: ${r.requirement}. Screeners often filter on this alone.`);
  }
  const unclearMandatory = mandatory.filter((r) => r.verdict === "unclear").length;
  if (unclearMandatory > 0) {
    risks.push(`${unclearMandatory} required item${unclearMandatory === 1 ? "" : "s"} could not be confirmed from your profile either way. Read those in the posting yourself.`);
  }
  for (const r of rules.risks) {
    if (/mandatory requirement|could not check automatically|Weak evidence/i.test(r)) continue;
    risks.push(r);
  }

  const improvements = open
    .filter((r) => r.gapToClose)
    .slice(0, 5)
    .map((r) => `${r.requirement}: ${r.gapToClose}`);
  if (total.missing.length > 0) {
    improvements.push(
      `Work-ly could not assess ${total.missing.length} part${total.missing.length === 1 ? "" : "s"} of this comparison. Filling in your profile makes the score more complete.`,
    );
  }

  return {
    fitScore,
    coverage: total.coverage,
    unassessed: total.missing,
    competitiveness,
    scoreBreakdown,
    recommendation,
    recommendationReasoning: reasoning,
    strengths,
    weaknesses: gaps.map((g) => g.description),
    gaps,
    mandatoryRequirements: mandatory.map(toCheck),
    preferredRequirements: reqs.filter((r) => r.importance === "nice").map(toCheck),
    risks,
    improvements,
    method: "ai-screen",
    screen: {
      summary: screen.summary,
      roleRelevance: screen.roleRelevance,
      relevanceRationale: screen.relevanceRationale,
      requirements: screen.requirements,
      dealbreakers: screen.dealbreakers,
      ungroundedDropped: screen.ungroundedDropped,
    },
  };
}

/**
 * "What would my score be if I closed these?" - the same calculation with
 * the named requirements flipped to met. No model call, no guess: it is
 * literally the current verdicts with the plan's targets marked done, so a
 * projected readiness can never promise more than the screen would give.
 */
export function projectWithClosed(
  params: { screen: GroundedScreen; rules: JobFitAnalysis; job: Job; profile: FullCareerProfile },
  requirementsToClose: string[],
): number {
  const targets = new Set(requirementsToClose.map(normalizeForMatch));
  // Skills, credentials and projects can be built in weeks. Years of
  // experience cannot: a plan can at most make an experience requirement
  // "partly" shown (by reframing and documenting what exists), never met.
  const requirements = params.screen.requirements.map((r) => {
    if (!targets.has(normalizeForMatch(r.requirement)) || r.verdict === "met") return r;
    if (r.category === "experience") {
      return r.verdict === "partial" ? r : { ...r, verdict: "partial" as const, evidenceQuote: "(planned)", evidenceWhere: "your plan" };
    }
    return { ...r, verdict: "met" as const, evidenceQuote: "(planned)", evidenceWhere: "your plan" };
  });
  const evidenceKinds = params.screen.evidenceKinds.map((k, i) =>
    targets.has(normalizeForMatch(params.screen.requirements[i].requirement)) && !k ? ("project" as const) : k,
  );
  const screen: GroundedScreen = {
    ...params.screen,
    requirements,
    evidenceKinds,
    dealbreakers: requirements.filter((r) => r.importance === "critical" && r.verdict === "missing").map((r) => r.requirement),
  };
  return combineScreen({ ...params, screen }).fitScore;
}
