import type {
  CareerGoal,
  Experience,
  GapItem,
  GapType,
  Job,
  RecommendationType,
  RequirementCheck,
  RequirementItem,
  ScoreBreakdown,
  Skill,
} from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";
import type { JobFitAnalysis, ScoringProvider } from "@/lib/scoring/types";
import {
  SENIORITY_ORDER,
  assumed,
  component,
  deriveCandidateSeniority,
  estimateYearsExperience,
  findMatchingSkill,
  normalize,
  seniorityIndex,
  totalFrom,
  unavailable,
  MIN_COVERAGE_FOR_SCORE,
} from "@/lib/scoring/shared";

/**
 * THE FIT ENGINE.
 *
 * What changed, and why it mattered: this engine used to be structurally
 * incapable of saying "I don't know". Every component had to return a
 * number, so an unmeasurable component returned either a zero or an invented
 * middle value, and both were displayed to the user as a measurement of
 * them.
 *
 * The concrete failure that motivated the rewrite: a candidate whose CV
 * import produced no parseable dates was told "You have 0 years of
 * experience, short of the 5-year requirement", lost a quarter of the
 * available points, and a completely blank profile against a real posting
 * scored 19/100, was labelled "Low" competitiveness, and was recommended
 * SKIP. Every one of those numbers was an artifact of missing data, stated
 * with total confidence.
 *
 * Three rules now govern every function below.
 *
 *   1. If we cannot measure it, we say so and drop it from the denominator.
 *      Missing data reduces how much of the picture we claim to have. It
 *      never reduces the person's score.
 *
 *   2. Reasoning text describes what WORKLY found, never what the candidate
 *      or the employer did, unless we actually observed it. "We could not
 *      identify required skills in this posting" is honest. "The posting
 *      didn't list required skills" is a claim about a document we may
 *      simply have failed to parse.
 *
 *   3. Absence of evidence is never evidence of either kind. A missing
 *      location does not mean the location matches, and an unparsed
 *      requirement does not mean the candidate fails it.
 */

// ---------------------------------------------------------------------------
// Weights. Sum to 100, though the effective denominator is now only the
// weight of the components we could actually measure.
// ---------------------------------------------------------------------------
const WEIGHTS = {
  skills: 30,
  experience: 25,
  education: 10,
  industryRelevance: 15,
  seniority: 10,
  location: 5,
  evidence: 5,
} as const;

/**
 * How much a skill claim is worth by how well it is backed.
 *
 * These are judgement calls, not measurements, and they are stated here in
 * one place so they can be argued with. INFERRED is deliberately the lowest:
 * it means a machine guessed the skill from context, and a machine's guess
 * about someone should count for less than that person's own statement.
 */
const EVIDENCE_QUALITY: Record<Skill["evidenceLevel"], number> = {
  STATED: 0.4,
  DEMONSTRATED: 0.85,
  CERTIFIED: 1,
  INFERRED: 0.3,
};

// ---------------------------------------------------------------------------
// Score components
// ---------------------------------------------------------------------------

function scoreSkills(job: Job, profileSkills: Skill[]) {
  const confirmed = profileSkills.filter((s) => !s.isTransferable);
  const requiredMatches = job.requiredSkills.map((name) => ({ name, match: findMatchingSkill(name, confirmed) }));
  const preferredMatches = job.preferredSkills.map((name) => ({ name, match: findMatchingSkill(name, confirmed) }));

  const requiredTotal = job.requiredSkills.length;
  const preferredTotal = job.preferredSkills.length;

  // Both sides have to have something to compare. Previously an empty
  // profile scored 0 of 30 with the sentence "You match 0/8 required
  // skills", which is a statement about the candidate when the truth was
  // that we had no skill inventory for them at all. Skills is the single
  // heaviest component, so getting this wrong dominated the whole score.
  if (confirmed.length === 0) {
    return {
      breakdown: unavailable(
        WEIGHTS.skills,
        "There are no skills on your profile yet, so this cannot be compared. Upload a CV or add skills to score it.",
      ),
      requiredMatches,
      preferredMatches,
    };
  }
  if (requiredTotal === 0 && preferredTotal === 0) {
    return {
      breakdown: unavailable(
        WEIGHTS.skills,
        "Workly could not identify specific skills in this posting, so there is nothing to match against. Check the original posting if it clearly lists them.",
      ),
      requiredMatches,
      preferredMatches,
    };
  }

  const requiredHit = requiredMatches.filter((m) => m.match).length;
  const preferredHit = preferredMatches.filter((m) => m.match).length;

  // Only blend in a ratio that was actually computed. The old code used a
  // fabricated 1.0 for a missing required list, which handed out a perfect
  // sub-score for the absence of data.
  let ratio: number;
  if (requiredTotal > 0 && preferredTotal > 0) {
    ratio = (requiredHit / requiredTotal) * 0.8 + (preferredHit / preferredTotal) * 0.2;
  } else if (requiredTotal > 0) {
    ratio = requiredHit / requiredTotal;
  } else {
    ratio = preferredHit / preferredTotal;
  }

  const parts: string[] = [];
  if (requiredTotal > 0) parts.push(`${requiredHit} of ${requiredTotal} required skills`);
  if (preferredTotal > 0) parts.push(`${preferredHit} of ${preferredTotal} preferred skills`);

  // A named skill list this short is a thin basis for a confident ratio -
  // "1 of 1 required skills" reads identically whether that one skill is
  // "leadership" (present in almost every profile, on almost every job,
  // meaning nothing) or something genuinely specific. Skills is the
  // heaviest single component (30 of 100), and a real production case
  // surfaced exactly this: an Occupational Therapy posting with one
  // extracted required skill ("leadership") the candidate's profile also
  // listed, maxing out all 30 points on a single generic coincidence and
  // dragging the blended Fit score into the 60s-70s for a role with no
  // real relevance to the candidate's background. Below
  // SKILL_SAMPLE_FULL_CONFIDENCE named skills, the component's own ceiling
  // shrinks in proportion to the sample size - the ratio itself is left
  // honest (you genuinely did match what was there), but a thin sample can
  // no longer carry the same weight as a real, multi-skill comparison. The
  // points this removes are not redistributed anywhere: they simply drop
  // out of both `earned` and `possible` in totalFrom, which is exactly
  // what shrinks `coverage` for a job Workly only got a thin read on - the
  // same "missing data reduces how much of the picture we claim to have"
  // principle this file states for fully-unavailable components, applied
  // here to a component that is available but too thin to trust fully.
  const SKILL_SAMPLE_FULL_CONFIDENCE = 3;
  const sampleSize = requiredTotal + preferredTotal;
  const effectiveWeight = WEIGHTS.skills * Math.min(1, sampleSize / SKILL_SAMPLE_FULL_CONFIDENCE);

  return {
    breakdown: component(ratio * effectiveWeight, effectiveWeight, `You match ${parts.join(" and ")}.`),
    requiredMatches,
    preferredMatches,
  };
}

function scoreExperience(job: Job, candidateYears: number | null) {
  const required = job.requiredExperienceYears;
  const preferred = job.preferredExperienceYears;

  // We do not know how long they have worked. This is the finding that
  // produced the "You have 0 years of experience" falsehood.
  if (candidateYears == null) {
    return unavailable(
      WEIGHTS.experience,
      "Workly does not have your years of experience yet. Add dates to your roles, or set it directly on your profile, and this will score.",
    );
  }
  if (required == null) {
    return unavailable(
      WEIGHTS.experience,
      "Workly could not find a required years of experience in this posting, so there is no bar to compare you against.",
    );
  }

  if (required === 0) {
    return component(
      WEIGHTS.experience,
      WEIGHTS.experience,
      "This posting sets no minimum years of experience.",
    );
  }

  let ratio = Math.min(1, candidateYears / required);
  let reasoning =
    candidateYears >= required
      ? `You have about ${candidateYears} year${candidateYears === 1 ? "" : "s"} of experience against a ${required}-year requirement.`
      : `You have about ${candidateYears} year${candidateYears === 1 ? "" : "s"} of experience, short of the ${required}-year requirement.`;

  if (preferred != null && candidateYears >= preferred) {
    ratio = Math.min(1, ratio + 0.1);
    reasoning += ` You also meet the ${preferred}-year preferred bar.`;
  }

  return component(ratio * WEIGHTS.experience, WEIGHTS.experience, reasoning);
}

const DEGREE_LEVELS: { level: number; patterns: RegExp }[] = [
  { level: 4, patterns: /\b(phd|ph\.d|doctorate|doctoral|dphil)\b/i },
  { level: 3, patterns: /\b(master(?:'?s)?|msc|m\.sc|m\.a\b|mba|meng|mphil|master of)\b/i },
  { level: 2, patterns: /\b(bachelor(?:'?s)?|bsc|b\.sc|b\.a\b|beng|undergraduate|bachelor of|university degree|(?:college|university)\s+degree)\b/i },
  { level: 1, patterns: /\b(associate(?:'?s)?|diploma|foundation|hnd|certificate)\b/i },
];

function degreeLevel(text: string | null | undefined): number | null {
  if (!text) return null;
  for (const { level, patterns } of DEGREE_LEVELS) {
    if (patterns.test(text)) return level;
  }
  return null;
}

/**
 * Education, compared at the level of the qualification rather than by
 * whether any education row exists.
 *
 * The old version marked "PhD in Molecular Biology" as satisfied for anyone
 * with any education entry at all, and told them "Covered by your education
 * entries". That is an affirmative false claim, and it inflated the score in
 * the dangerous direction: it could turn a SKIP into an APPLY.
 */
function scoreEducation(job: Job, profile: FullCareerProfile) {
  const requirementText = [
    job.education,
    ...job.requirements.filter((r) => r.category === "education").map((r) => r.text),
  ]
    .filter(Boolean)
    .join(" ");

  const mandatory = job.requirements.some((r) => r.category === "education" && r.mandatory) || Boolean(job.education);

  if (!requirementText.trim()) {
    return unavailable(
      WEIGHTS.education,
      "Workly could not find an education requirement in this posting, so there is nothing to compare your qualifications against.",
    );
  }
  if (profile.educations.length === 0) {
    return component(
      0,
      WEIGHTS.education,
      mandatory
        ? "This posting states an education requirement, and there is no education on your profile."
        : "This posting prefers a particular education background, and there is none on your profile.",
    );
  }

  const requiredLevel = degreeLevel(requirementText);
  const held = profile.educations.map((e) => degreeLevel(`${e.degree ?? ""} ${e.fieldOfStudy ?? ""}`));
  const bestHeld = held.reduce<number | null>((best, l) => (l != null && (best == null || l > best) ? l : best), null);

  // Neither side names a level we recognise. We have education rows and a
  // requirement, but no basis to say whether one satisfies the other.
  if (requiredLevel == null || bestHeld == null) {
    return unavailable(
      WEIGHTS.education,
      "Workly could not read a qualification level from either the posting or your profile, so it is not scoring this. Check it yourself against the posting.",
    );
  }

  if (bestHeld >= requiredLevel) {
    return component(
      WEIGHTS.education,
      WEIGHTS.education,
      "Your highest qualification is at or above the level this posting asks for.",
    );
  }

  // A real, measured shortfall, scaled by how far below.
  const ratio = Math.max(0, bestHeld / requiredLevel);
  return component(
    ratio * WEIGHTS.education,
    WEIGHTS.education,
    "Your highest qualification is below the level this posting asks for.",
  );
}

function scoreIndustry(job: Job, profile: FullCareerProfile, careerGoal: CareerGoal | null) {
  if (!job.industry) {
    return unavailable(
      WEIGHTS.industryRelevance,
      "Workly could not identify an industry for this posting, so it cannot judge how relevant your background is.",
    );
  }

  const haystackParts = [
    profile.profile?.headline,
    profile.profile?.summary,
    profile.profile?.currentCompany,
    ...profile.experiences.map((e) => `${e.company} ${e.title} ${e.description ?? ""}`),
    ...(careerGoal?.industries ?? []),
  ].filter(Boolean);

  // Nothing on our side to search. Scoring 0.4 here used to assert
  // "Nothing on your profile clearly ties to X" about a profile we had not
  // actually read anything from.
  if (haystackParts.length === 0) {
    return unavailable(
      WEIGHTS.industryRelevance,
      "There is nothing on your profile yet to compare against this industry.",
    );
  }

  const haystack = haystackParts.join(" ").toLowerCase();
  const industryNorm = job.industry.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const industryPattern = new RegExp(`\\b${industryNorm}\\b`, "i");
  const match = industryPattern.test(haystack);

  return component(
    (match ? 1 : 0.4) * WEIGHTS.industryRelevance,
    WEIGHTS.industryRelevance,
    match
      ? `Your background mentions ${job.industry}.`
      : `Nothing on your profile mentions ${job.industry}. That may simply mean it is new to you.`,
  );
}

function scoreSeniority(job: Job, candidateYears: number | null, careerGoal: CareerGoal | null) {
  if (!job.seniority) {
    return unavailable(
      WEIGHTS.seniority,
      "Workly could not identify a seniority level in this posting.",
    );
  }

  const candidateLevel = deriveCandidateSeniority(candidateYears, careerGoal);
  if (!candidateLevel) {
    return unavailable(
      WEIGHTS.seniority,
      "Workly does not know your current level yet. Set a seniority on your career goal, or add dated roles, and this will score.",
    );
  }

  const candidateIdx = seniorityIndex(candidateLevel);
  const jobIdx = seniorityIndex(job.seniority);

  // An unrecognised level would previously produce indexOf === -1 and a
  // fabricated distance, which in the Priority engine surfaced as a
  // confident "this role is a step down from your current level".
  if (candidateIdx < 0 || jobIdx < 0) {
    return unavailable(WEIGHTS.seniority, "Workly could not place one of these on its seniority scale.");
  }

  const distance = Math.abs(candidateIdx - jobIdx);
  const ratio = Math.max(0, 1 - distance * 0.25);

  let reasoning: string;
  if (distance === 0) {
    reasoning = `Your level lines up with the ${job.seniority.toLowerCase()} level this role asks for.`;
  } else if (candidateIdx < jobIdx) {
    reasoning = `This role is pitched above your current level (${job.seniority.toLowerCase()} against your ${candidateLevel.toLowerCase()} level), so it is a stretch.`;
  } else {
    reasoning = `This role is pitched below your current level (${job.seniority.toLowerCase()} against your ${candidateLevel.toLowerCase()} level).`;
  }

  return { breakdown: component(ratio * WEIGHTS.seniority, WEIGHTS.seniority, reasoning), ratio };
}

function scoreLocation(job: Job, profile: FullCareerProfile, careerGoal: CareerGoal | null) {
  const preferredLocations = profile.profile?.preferredLocations?.length
    ? profile.profile.preferredLocations
    : (careerGoal?.preferredLocations ?? []);
  const home = profile.profile?.location ?? null;
  const countries = careerGoal?.countries ?? [];
  const workModes = careerGoal?.workModes ?? [];

  // A remote job is not automatically global. If the job specifies a country that is clearly not the user's country, it's a mismatch.
  const isRemote = job.workMode === "REMOTE";
  if (isRemote) {
    const candidateCountries = [...countries];
    if (home && !candidateCountries.some(c => home.includes(c))) {
      candidateCountries.push(home);
    }
    
    if (job.country && candidateCountries.length > 0 && !candidateCountries.some(c => job.country!.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(job.country!.toLowerCase()))) {
      return component(WEIGHTS.location, 0, `Remote, but restricted to ${job.country} which does not match your target countries.`);
    }
    return assumed(WEIGHTS.location, WEIGHTS.location, "This role is remote, making it broadly location-compatible.");
  }

  const anyPreference = Boolean(home) || preferredLocations.length > 0 || countries.length > 0 || workModes.length > 0;

  if (!anyPreference) {
    return unavailable(
      WEIGHTS.location,
      "You have not told Workly where you want to work, so it cannot judge this role's location.",
    );
  }

  // Each dimension is true, false, or unknown. The old code treated a
  // missing job location as satisfied, which produced the affirmative
  // sentence "This role's location lines up with your preferences" from no
  // data at all, and awarded full marks for it.
  const checks: (boolean | null)[] = [];

  if (job.workMode && workModes.length > 0) checks.push(workModes.includes(job.workMode));
  if (job.location && (preferredLocations.length > 0 || home)) {
    const candidates = [home, ...preferredLocations].filter(Boolean) as string[];
    const loc = job.location.toLowerCase();
    checks.push(candidates.some((c) => loc.includes(c.toLowerCase()) || c.toLowerCase().includes(loc)));
  }
  if (job.country && countries.length > 0) {
    const c = job.country.toLowerCase();
    checks.push(countries.some((x) => c.includes(x.toLowerCase()) || x.toLowerCase().includes(c)));
  }

  if (checks.length === 0) {
    return unavailable(
      WEIGHTS.location,
      "This posting does not say where the role is based, so Workly cannot check it against your preferences.",
    );
  }

  const allOk = checks.every(Boolean);
  return component(
    (allOk ? 1 : 0.4) * WEIGHTS.location,
    WEIGHTS.location,
    allOk
      ? "Where this role is based matches what you said you wanted."
      : "Where this role is based does not match what you said you wanted.",
  );
}

function scoreEvidence(requiredMatches: { name: string; match: Skill | undefined }[]) {
  const matched = requiredMatches.map((m) => m.match).filter((s): s is Skill => Boolean(s));

  // The old version awarded 2.5 of 5 while its own reasoning string
  // admitted there was nothing to assess. If there is nothing to assess,
  // that is what it should say, and it should cost nothing.
  if (matched.length === 0) {
    return unavailable(
      WEIGHTS.evidence,
      "None of your skills matched this posting's requirements, so there is no evidence quality to assess.",
    );
  }

  const strongCount = matched.filter((s) => s.evidenceLevel === "DEMONSTRATED" || s.evidenceLevel === "CERTIFIED").length;
  const strongRatio = strongCount / matched.length;

  // Blended formula: a base 0.5 for having matching skills at all, plus
  // up to 0.5 more based on evidence quality. This means adding a STATED
  // skill can never reduce your score below where you were — you always
  // get at least the base credit for the match, plus any quality bonus.
  // The old pure-average approach penalized candidates for adding more
  // correctly-matched skills if they lacked strong evidence on each one.
  const ratio = 0.5 + 0.5 * strongRatio;

  return component(
    ratio * WEIGHTS.evidence,
    WEIGHTS.evidence,
    strongCount > 0
      ? `${strongCount} of your ${matched.length} matched skills are backed by evidence rather than only stated.`
      : "Your matched skills are self-stated rather than demonstrated through projects or certifications.",
  );
}

// ---------------------------------------------------------------------------
// Requirements checklist, gaps, recommendation, narrative
// ---------------------------------------------------------------------------

const REQUIREMENT_STOPWORDS = new Set([
  "a", "an", "the", "of", "or", "and", "with", "in", "on", "to", "for", "your", "you", "years", "year",
  "experience", "skills", "skill", "strong", "proven", "demonstrated", "ability", "excellent", "good",
  "solid", "working", "knowledge", "background", "familiarity",
]);

/**
 * Prose requirements ("Experience mentoring or leading engineers") do not
 * match a skill list by name, but a user's own Experience entries often
 * state exactly this in their own words. Plain keyword overlap against text
 * the user actually wrote, never a semantic guess.
 */
function findSupportingExperience(requirementText: string, experiences: Experience[]): Experience | undefined {
  const words = normalize(requirementText)
    .split(" ")
    .filter((w) => w.length >= 2 && !REQUIREMENT_STOPWORDS.has(w));
  if (words.length === 0) return undefined;
  return experiences.find((exp) => {
    const haystack = normalize(`${exp.title} ${exp.description ?? ""}`);
    if (!haystack.trim()) return false;
    const matched = words.filter((w) => haystack.includes(w));
    return matched.length >= Math.min(2, words.length) && matched.length / words.length >= 0.5;
  });
}

/**
 * Every requirement gets one of three answers, never two.
 *
 * "unknown" is the important addition. Most real requirement bullets are
 * prose that keyword matching cannot verify either way, and recording those
 * as `met: false` turned a limitation of the matcher into an assertion that
 * the candidate fails the requirement, then counted it as a failure in four
 * downstream numbers and two sentences shown to the user.
 */
function buildRequirementChecklist(
  items: RequirementItem[],
  profileSkills: Skill[],
  profile: FullCareerProfile,
  experiences: Experience[],
  candidateYears: number | null,
): RequirementCheck[] {
  return items.map((item): RequirementCheck => {
    if (item.category === "education") {
      const requiredLevel = degreeLevel(item.text);
      const bestHeld = profile.educations
        .map((e) => degreeLevel(`${e.degree ?? ""} ${e.fieldOfStudy ?? ""}`))
        .reduce<number | null>((best, l) => (l != null && (best == null || l > best) ? l : best), null);

      if (requiredLevel == null || bestHeld == null) {
        return {
          text: item.text,
          status: "unknown",
          detail: "Workly could not read a qualification level here. Check this one yourself.",
        };
      }
      return bestHeld >= requiredLevel
        ? { text: item.text, status: "met", detail: "Your highest qualification is at or above this level." }
        : { text: item.text, status: "not-met", detail: "Your highest qualification is below this level." };
    }

    if (item.category === "experience") {
      const yearsMatch = item.text.match(/(\d+)\+?\s*years?/i);
      if (yearsMatch) {
        if (candidateYears == null) {
          return {
            text: item.text,
            status: "unknown",
            detail: "Workly does not know your years of experience yet, so it cannot check this.",
          };
        }
        const required = Number(yearsMatch[1]);
        return candidateYears >= required
          ? {
              text: item.text,
              status: "met",
              detail: `You have about ${candidateYears} years, meeting the ${required}+ year bar.`,
            }
          : {
              text: item.text,
              status: "not-met",
              detail: `This asks for ${required}+ years; your profile shows about ${candidateYears}.`,
            };
      }
    }

    if (item.category === "skill") {
      const nonTransferable = profileSkills.filter((s) => !s.isTransferable);
      let match = findMatchingSkill(item.text, nonTransferable);
      
      if (!match) {
        match = nonTransferable.find((s) => {
          const escaped = s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const pattern = new RegExp(`\\b${escaped}\\b`, "i");
          return pattern.test(item.text);
        });
      }

      if (match) {
        return { text: item.text, status: "met", detail: `Matched to "${match.name}" on your profile.` };
      }
      const experienceMatch = findSupportingExperience(item.text, experiences);
      if (experienceMatch) {
        return {
          text: item.text,
          status: "met",
          detail: `Referenced in your ${experienceMatch.title} experience at ${experienceMatch.company}.`,
        };
      }
      // A named skill genuinely absent from a populated profile is a real
      // negative. A named skill absent from an EMPTY profile is not.
      if (profileSkills.length === 0) {
        return {
          text: item.text,
          status: "unknown",
          detail: "There are no skills on your profile yet to check this against.",
        };
      }
      return { text: item.text, status: "not-met", detail: "No matching skill on your profile." };
    }

    const experienceMatch = findSupportingExperience(item.text, experiences);
    if (experienceMatch) {
      return {
        text: item.text,
        status: "met",
        detail: `Referenced in your ${experienceMatch.title} experience at ${experienceMatch.company}.`,
      };
    }
    return {
      text: item.text,
      status: "unknown",
      detail: "Workly could not check this one automatically. Review it yourself.",
    };
  });
}

function classifyGaps(params: {
  job: Job;
  profile: FullCareerProfile;
  requiredMatches: { name: string; match: Skill | undefined }[];
  candidateYears: number | null;
  seniorityRatio: number | null;
}): GapItem[] {
  const gaps: GapItem[] = [];
  const { job, profile, requiredMatches, candidateYears, seniorityRatio } = params;

  // Only a gap if we actually have a profile to compare. Otherwise every
  // required skill reads as "missing" when it is simply unchecked.
  const missingSkills =
    profile.skills.length > 0 ? requiredMatches.filter((m) => !m.match).map((m) => m.name) : [];
  if (missingSkills.length > 0) {
    gaps.push({
      type: "SKILL_GAP" as GapType,
      title: `${missingSkills.length} required skill${missingSkills.length === 1 ? "" : "s"} not on your profile`,
      description: `${missingSkills.slice(0, 6).join(", ")}${missingSkills.length > 6 ? ", and others" : ""}`,
    });
  }

  if (candidateYears != null && job.requiredExperienceYears != null && candidateYears < job.requiredExperienceYears) {
    gaps.push({
      type: "EXPERIENCE_GAP" as GapType,
      title: "Below the stated years of experience",
      description: `This role asks for ${job.requiredExperienceYears}+ years; your profile shows about ${candidateYears}.`,
    });
  }

  const matchedSkills = requiredMatches.map((m) => m.match).filter((s): s is Skill => Boolean(s));
  const weakEvidence = matchedSkills.filter((s) => s.evidenceLevel === "STATED" || s.evidenceLevel === "INFERRED");
  if (matchedSkills.length > 0 && weakEvidence.length / matchedSkills.length > 0.5) {
    gaps.push({
      type: "EVIDENCE_GAP" as GapType,
      title: "Matched skills lack strong evidence",
      description: "Most of your matched skills are self-stated rather than backed by a project or certification.",
    });
  }

  const wantsPortfolio = /\b(portfolio|github|work samples?|case stud)/i.test(
    `${job.description ?? ""} ${job.requirements.map((r) => r.text).join(" ")}`,
  );
  if (wantsPortfolio && profile.projects.length === 0) {
    gaps.push({
      type: "PORTFOLIO_GAP" as GapType,
      title: "No portfolio or project work on file",
      description: "This posting references a portfolio or work samples, but you have no projects added yet.",
    });
  }

  const requiresEducationOrCredential =
    Boolean(job.education) || job.requirements.some((r) => r.category === "education" && r.mandatory);
  if (requiresEducationOrCredential && profile.educations.length === 0 && profile.certifications.length === 0) {
    gaps.push({
      type: "CREDENTIAL_GAP" as GapType,
      title: "Missing the stated education or credential",
      description: job.education ?? "This posting lists an education requirement not reflected on your profile.",
    });
  }

  if (job.seniority && seniorityRatio != null && seniorityRatio < 0.5) {
    const candidateLevel = deriveCandidateSeniority(candidateYears, null);
    const candidateIdx = candidateLevel ? seniorityIndex(candidateLevel) : -1;
    const jobIdx = seniorityIndex(job.seniority);
    const isOverqualified = candidateIdx > jobIdx;

    gaps.push({
      type: "SENIORITY_GAP" as GapType,
      title: isOverqualified ? "Overqualified for this role" : "Seniority mismatch",
      description: isOverqualified
        ? `This role is pitched at a ${job.seniority.toLowerCase()} level, which is well below your experience. You may find it unchallenging, and employers may question the fit.`
        : `This role is pitched at a ${job.seniority.toLowerCase()} level, which is above what your profile currently shows. This is a significant stretch.`,
    });
  }

  if (job.industry && (profile.profile?.headline || profile.profile?.summary)) {
    const haystack = [profile.profile?.headline, profile.profile?.summary].filter(Boolean).join(" ").toLowerCase();
    if (!haystack.includes(job.industry.toLowerCase())) {
      gaps.push({
        type: "POSITIONING_GAP" as GapType,
        title: "Profile does not position you for this industry",
        description: `Your headline and summary do not currently mention ${job.industry}. Worth tailoring if you apply.`,
      });
    }
  }

  return gaps;
}

/**
 * The recommendation.
 *
 * `mandatoryMetRatio` is now nullable, and that matters: it used to fall
 * back to a hard-coded 0.6 when nothing could be checked, which landed
 * squarely in the STRETCH band and silently gated the advice the user acts
 * on behind a number nobody measured.
 */
function buildRecommendation(
  fitScore: number,
  coverage: number,
  mandatoryMetRatio: number | null,
  checkedCount: number,
): { recommendation: RecommendationType; reasoning: string } {
  // Not enough of the picture to advise on at all.
  if (coverage < MIN_COVERAGE_FOR_SCORE) {
    return {
      recommendation: "LOW_PRIORITY",
      reasoning:
        "Workly could only assess a small part of this role against your profile, so it is not making a recommendation. Fill in more of your profile, or check the posting parsed correctly, and this will sharpen up.",
    };
  }
  
  // Prevent APPLY_NOW if data is extremely sparse, but allow STRONG (APPLY) if it's over 40%
  if (coverage < 0.40) {
    return {
      recommendation: fitScore >= 55 ? "STRETCH" : "LOW_PRIORITY",
      reasoning: `Workly could only assess ${Math.round(coverage * 100)}% of this role's requirements. Based on what is visible, Candidate Fit is ${fitScore}/100, making it a stretch at best.`,
    };
  }

  const basis =
    mandatoryMetRatio != null
      ? `You clearly meet ${Math.round(mandatoryMetRatio * 100)}% of the ${checkedCount} mandatory requirement${checkedCount === 1 ? "" : "s"} Workly could check, with a Candidate Fit of ${fitScore}/100.`
      : `Workly could not verify any mandatory requirements automatically. Candidate Fit is ${fitScore}/100.`;

  // With no requirement signal, decide on fit alone rather than on an
  // invented ratio, and say that is what happened.
  if (mandatoryMetRatio == null) {
    if (fitScore >= 80) return { recommendation: "APPLY", reasoning: `${basis} On profile match alone this looks strong.` };
    if (fitScore >= 55) return { recommendation: "STRETCH", reasoning: `${basis} On profile match alone this is a reasonable stretch.` };
    return { recommendation: "LOW_PRIORITY", reasoning: `${basis} On profile match alone the overlap is limited.` };
  }

  if (mandatoryMetRatio >= 0.9 && fitScore >= 80) {
    return { recommendation: "APPLY_NOW", reasoning: `${basis} You meet essentially every checkable requirement. This is a strong match worth prioritising.` };
  }
  if (mandatoryMetRatio >= 0.9 && fitScore >= 55) {
    return { recommendation: "APPLY", reasoning: `${basis} You meet essentially every checkable requirement, and the overall profile overlap is solid.` };
  }
  if (mandatoryMetRatio >= 0.7 && fitScore >= 65) {
    return { recommendation: "APPLY", reasoning: `${basis} You meet the great majority of them, so this is worth applying to.` };
  }
  if (mandatoryMetRatio >= 0.7 && fitScore >= 45) {
    return { recommendation: "STRETCH", reasoning: `${basis} You meet most checkable requirements, but the broader profile overlap is limited. A reasonable stretch.` };
  }
  if (mandatoryMetRatio >= 0.4 && fitScore >= 45) {
    return { recommendation: "STRETCH", reasoning: `${basis} There are real gaps, but enough overlap for a reasonable stretch application.` };
  }
  if (fitScore >= 25) {
    return { recommendation: "LOW_PRIORITY", reasoning: `${basis} The overlap here is limited.` };
  }
  return { recommendation: "SKIP", reasoning: `${basis} On what Workly can see, this role does not line up with your profile today.` };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

function getCoreWords(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  const stopwords = new Set(["and","or","the","a","an","in","on","at","to","for","of","with","as","by","is","are","this","that","freelance","associate","junior","senior","lead","manager","director","head","vp","president","assistant","coordinator","specialist","officer","staff","worker","level","i","ii","iii","iv"]);
  return new Set(text.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopwords.has(w)));
}

function analyzeFit({
  profile,
  careerGoal,
  job,
}: {
  profile: FullCareerProfile;
  careerGoal: CareerGoal | null;
  job: Job;
}): JobFitAnalysis {
  const candidateYears = estimateYearsExperience(profile);
  
  // Severe Mismatch Penalty: if the job title shares absolutely zero core concepts
  // with the candidate's career goal, current headline, or top skills, it is likely
  // an irrelevant garbage pull from an API. We calculate a severe penalty multiplier.
  const titleWords = getCoreWords(job.title);
  const profileWords = new Set([
    ...getCoreWords(careerGoal?.title ?? ""),
    ...getCoreWords(profile.profile?.headline ?? ""),
    ...getCoreWords(profile.experiences[0]?.title ?? ""),
    ...profile.skills.filter(s => !s.isTransferable).map(s => s.name.toLowerCase())
  ]);
  
  let hasIntersection = false;
  for (const w of titleWords) {
    if (profileWords.has(w) || Array.from(profileWords).some((pw) => typeof pw === "string" && typeof w === "string" && (pw.includes(w) || w.includes(pw)))) {
      hasIntersection = true;
      break;
    }
  }
  
  // If no intersection, penalize the final fit score heavily
  const severeMismatchPenalty = (titleWords.size > 0 && !hasIntersection) ? 0.25 : 1.0;


  const skills = scoreSkills(job, profile.skills);
  const experience = scoreExperience(job, candidateYears);
  const education = scoreEducation(job, profile);
  const industryRelevance = scoreIndustry(job, profile, careerGoal);
  const seniorityResult = scoreSeniority(job, candidateYears, careerGoal);
  const location = scoreLocation(job, profile, careerGoal);
  const evidence = scoreEvidence(skills.requiredMatches);

  // Seniority returns either a bare unavailable component or a component
  // plus its ratio. The ratio used to be recomputed separately with a
  // subtly different formula that lacked the clamp, so it could go
  // negative, and it duplicated the same magic default in two places.
  const seniority = "breakdown" in seniorityResult ? seniorityResult.breakdown : seniorityResult;
  const seniorityRatio = "ratio" in seniorityResult ? seniorityResult.ratio : null;

  const scoreBreakdown: ScoreBreakdown = {
    skills: skills.breakdown,
    experience,
    education,
    industryRelevance,
    seniority,
    location,
    evidence,
  };

  const total = totalFrom(scoreBreakdown as unknown as Record<string, (typeof scoreBreakdown)["skills"]>);

  // The score is now "of what we could assess, how much do you meet". When
  // too little was assessable the number is withheld entirely rather than
  // dressed up, because a precise figure derived from two of seven
  // components is exactly the kind of number that persuades wrongly.
  const fitScore = total.score != null ? Math.round(total.score * severeMismatchPenalty) : 0;
  const competitiveness: JobFitAnalysis["competitiveness"] =
    total.score == null ? "Insufficient data" : fitScore >= 75 ? "High" : fitScore >= 50 ? "Moderate" : "Low";

  const mandatoryRequirements = buildRequirementChecklist(
    job.requirements.filter((r) => r.mandatory),
    profile.skills,
    profile,
    profile.experiences,
    candidateYears,
  );
  const preferredRequirements = buildRequirementChecklist(
    job.requirements.filter((r) => !r.mandatory),
    profile.skills,
    profile,
    profile.experiences,
    candidateYears,
  );

  // Ratios exclude "unknown" from BOTH sides. An unverifiable requirement
  // is not a failure, and counting it as one was one of the most
  // consequential falsehoods in the old engine.
  const checkable = mandatoryRequirements.filter((r) => r.status !== "unknown");
  const mandatoryMetRatio =
    checkable.length > 0 ? checkable.filter((r) => r.status === "met").length / checkable.length : null;
  const unknownCount = mandatoryRequirements.length - checkable.length;

  const { recommendation, reasoning: recommendationReasoning } = buildRecommendation(
    fitScore,
    total.coverage,
    mandatoryMetRatio,
    checkable.length,
  );

  const gaps = classifyGaps({
    job,
    profile,
    requiredMatches: skills.requiredMatches,
    candidateYears,
    seniorityRatio,
  });

  const strengths: string[] = [];
  const matchedRequired = skills.requiredMatches.filter((m) => m.match);
  if (matchedRequired.length > 0) {
    strengths.push(`Strong overlap on required skills: ${matchedRequired.slice(0, 6).map((m) => m.match!.name).join(", ")}.`);
  }
  const strongEvidence = matchedRequired.filter(
    (m) => m.match!.evidenceLevel === "DEMONSTRATED" || m.match!.evidenceLevel === "CERTIFIED",
  );
  if (strongEvidence.length > 0) {
    strengths.push(`${strongEvidence.length} of your matched skills are backed by evidence, not just claimed.`);
  }
  if (candidateYears != null && job.requiredExperienceYears != null && candidateYears >= job.requiredExperienceYears) {
    strengths.push(`You meet or exceed the ${job.requiredExperienceYears}-year experience bar.`);
  }
  if (
    industryRelevance.confidence === "measured" &&
    industryRelevance.score >= WEIGHTS.industryRelevance * 0.8
  ) {
    strengths.push(industryRelevance.reasoning);
  }
  // No fabricated consolation. The old fallback asserted "your profile has
  // some overlap with this role" in precisely the case where none had been
  // found.

  const weaknesses = gaps.map((g) => g.description);

  const risks: string[] = [];
  if (mandatoryMetRatio != null && mandatoryMetRatio < 1) {
    const unmet = checkable.filter((r) => r.status === "not-met").length;
    if (unmet > 0) {
      risks.push(`${unmet} mandatory requirement${unmet === 1 ? "" : "s"} you do not appear to meet. Reviewers may screen you out on these.`);
    }
  }
  if (unknownCount > 0) {
    risks.push(`${unknownCount} mandatory requirement${unknownCount === 1 ? "" : "s"} Workly could not check automatically. Read those in the posting yourself.`);
  }
  if (evidence.confidence === "measured" && evidence.score < WEIGHTS.evidence * 0.5) {
    risks.push("Weak evidence behind your core skill claims could hurt you in a screen or interview.");
  }
  if (job.seniority && seniorityRatio != null && seniorityRatio < 0.5) {
    risks.push("This role is pitched at a different seniority than your profile suggests, which may raise questions.");
  }

  const improvements: string[] = [];
  const missingRequired =
    profile.skills.length > 0 ? skills.requiredMatches.filter((m) => !m.match).map((m) => m.name) : [];
  if (missingRequired.length > 0) {
    improvements.push(`Add evidence for: ${missingRequired.slice(0, 5).join(", ")}. Even a brief project or course helps.`);
  }
  if (evidence.confidence === "measured" && evidence.score < WEIGHTS.evidence * 0.7 && matchedRequired.length > 0) {
    improvements.push("Strengthen evidence on your existing skills. Link a project, certification, or specific outcome.");
  }
  if (gaps.some((g) => g.type === "PORTFOLIO_GAP")) {
    improvements.push("Add a project or portfolio link. This posting references work samples.");
  }
  if (gaps.some((g) => g.type === "POSITIONING_GAP")) {
    improvements.push(`Tailor your headline and summary toward ${job.industry} before applying.`);
  }
  // When components could not be assessed, the most useful improvement is
  // to fix that, rather than the old blanket "your profile is well-aligned"
  // which could be shown to someone with no profile at all.
  if (total.missing.length > 0) {
    improvements.push(
      `Workly could not assess ${total.missing.length} part${total.missing.length === 1 ? "" : "s"} of this comparison. Filling in the gaps noted above will make the score meaningful.`,
    );
  }

  return {
    fitScore,
    coverage: total.coverage,
    unassessed: total.missing,
    competitiveness,
    scoreBreakdown,
    recommendation,
    recommendationReasoning,
    strengths,
    weaknesses,
    gaps,
    mandatoryRequirements,
    preferredRequirements,
    risks,
    improvements,
  };
}

export const deterministicScoringProvider: ScoringProvider = {
  name: "deterministic",
  analyzeFit,
};
