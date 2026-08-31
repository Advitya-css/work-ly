import "server-only";

import type { CareerGoal, OpportunityWithJob, Skill } from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";
import { normalize, skillsMatch } from "@/lib/scoring/shared";

/**
 * Career Explorer - adjacent roles worth considering.
 *
 * Two sources, both grounded:
 *
 *  1. Roles the user has ALREADY analyzed (their Opportunity rows). These
 *     carry a real Candidate Fit computed by the Phase 3 engine, so
 *     "current fit" is a measured number, not a guess.
 *
 *  2. A small, explicit adjacency table for roles they haven't looked at.
 *     Fit for these is computed by overlapping the role's typical skills
 *     against the user's confirmed skills - and is labelled as indicative,
 *     because unlike (1) there's no real posting behind it.
 *
 * The table is deliberately small and hand-written rather than
 * model-generated: every entry is a widely-recognised career adjacency, and
 * a short curated list the user can trust beats a long speculative one.
 */

export interface AdjacentCareer {
  role: string;
  whyItFits: string;
  /// 0-100 Candidate Fit. `isMeasured` says whether this came from a real
  /// analyzed posting or from skill overlap against the adjacency table.
  currentFit: number;
  isMeasured: boolean;
  requiredSkills: string[];
  matchedSkills: string[];
  typicalEntryRoute: string;
  /// Count of the user's own tracked opportunities matching this role.
  relevantJobCount: number;
  relevantJobTitles: string[];
}

interface AdjacencyEntry {
  role: string;
  /// Role titles/keywords that make this adjacency relevant.
  from: string[];
  coreSkills: string[];
  entryRoute: string;
}

const ADJACENCY_TABLE: AdjacencyEntry[] = [
  {
    role: "Data Analyst",
    from: ["analyst", "research", "product analyst", "operations", "finance", "economics"],
    coreSkills: ["SQL", "Excel", "Data visualization", "Statistics"],
    entryRoute: "Most people move in from an adjacent analyst or operations role by building a SQL + dashboard portfolio, rather than by retraining formally.",
  },
  {
    role: "Product Manager",
    from: ["analyst", "product", "engineer", "designer", "consultant", "operations"],
    coreSkills: ["Stakeholder communication", "Roadmapping", "User research", "Prioritization"],
    entryRoute: "Usually an internal move: take ownership of a feature area in your current company first, then move externally with that track record.",
  },
  {
    role: "Data Scientist",
    from: ["analyst", "research", "statistics", "data analyst", "economics", "physics"],
    coreSkills: ["Python", "Statistics", "Machine learning", "SQL"],
    entryRoute: "Typically requires demonstrable modelling work. A portfolio of end-to-end projects is the common route from an analyst role.",
  },
  {
    role: "Policy Analyst",
    from: ["research", "economics", "political", "policy", "public", "analyst"],
    coreSkills: ["Research", "Writing", "Quantitative analysis", "Stakeholder communication"],
    entryRoute: "Research assistant or think-tank internship into a junior analyst post; published writing matters more than credentials alone.",
  },
  {
    role: "Business Analyst",
    from: ["analyst", "consultant", "operations", "finance", "product"],
    coreSkills: ["Requirements gathering", "SQL", "Process mapping", "Stakeholder communication"],
    entryRoute: "Commonly an internal sideways move from operations or support, with a business-process qualification as an optional accelerator.",
  },
  {
    role: "Analytics Engineer",
    from: ["data analyst", "analyst", "engineer", "backend", "data"],
    coreSkills: ["SQL", "dbt", "Data modelling", "Python"],
    entryRoute: "The standard route in is from data analyst. Learn a transformation tool and version control, then move on internal projects.",
  },
  {
    role: "UX Researcher",
    from: ["research", "psychology", "design", "analyst", "user"],
    coreSkills: ["User research", "Interviewing", "Synthesis", "Survey design"],
    entryRoute: "Portfolio-led: two or three well-documented research studies usually matter more than a specific degree.",
  },
  {
    role: "Solutions Engineer",
    from: ["engineer", "developer", "support", "consultant", "technical"],
    coreSkills: ["Technical communication", "APIs", "Presentation", "Problem solving"],
    entryRoute: "Common move for engineers who prefer customer-facing work; usually hired on demonstrated communication skill plus existing technical depth.",
  },
  {
    role: "Engineering Manager",
    from: ["senior engineer", "lead", "staff", "engineer", "tech lead"],
    coreSkills: ["Mentoring", "People management", "Project delivery", "Hiring"],
    entryRoute: "Almost always an internal promotion. Start by formally mentoring, then leading a project, then a team.",
  },
  {
    role: "DevOps Engineer",
    from: ["engineer", "backend", "infrastructure", "sysadmin", "developer"],
    coreSkills: ["Cloud infrastructure", "Kubernetes", "CI/CD", "Terraform"],
    entryRoute: "Usually from backend or systems work by taking on deployment and reliability responsibilities in your current role first.",
  },
];

function profileRoleKeywords(profile: FullCareerProfile, careerGoal: CareerGoal | null): string[] {
  return [
    profile.profile?.currentRole,
    profile.profile?.headline,
    ...profile.experiences.slice(0, 3).map((e) => e.title),
    careerGoal?.primaryTargetRole,
    ...(careerGoal?.secondaryTargetRoles ?? []),
  ]
    .filter((v): v is string => Boolean(v))
    .map(normalize);
}

function matchSkills(coreSkills: string[], confirmed: Skill[]): string[] {
  return coreSkills.filter((core) => confirmed.some((s) => skillsMatch(s.name, core)));
}

export function exploreCareers(params: {
  profile: FullCareerProfile;
  careerGoal: CareerGoal | null;
  opportunities: OpportunityWithJob[];
  /// Excluded from suggestions - the user is already targeting this.
  currentTarget: string | null;
}): AdjacentCareer[] {
  const { profile, careerGoal, opportunities, currentTarget } = params;
  const confirmed = profile.skills.filter((s) => !s.isTransferable);
  const keywords = profileRoleKeywords(profile, careerGoal);
  const results: AdjacentCareer[] = [];
  const seen = new Set<string>();

  // --- Source 1: roles the user has actually analyzed ---------------------
  // Group their opportunities by job title and use the real measured fit.
  const byTitle = new Map<string, OpportunityWithJob[]>();
  for (const opportunity of opportunities) {
    const title = opportunity.job.title?.trim();
    if (!title) continue;
    const key = normalize(title);
    if (currentTarget && key === normalize(currentTarget)) continue;
    byTitle.set(key, [...(byTitle.get(key) ?? []), opportunity]);
  }

  for (const [key, group] of byTitle) {
    const best = group.reduce((a, b) => (b.fitScore > a.fitScore ? b : a));
    // Only surface roles they're plausibly close to - a 20/100 fit isn't an
    // "adjacent career", it's a different career.
    if (best.fitScore < 45) continue;

    const requiredSkills = best.job.requiredSkills.slice(0, 6);
    results.push({
      role: best.job.title!.trim(),
      whyItFits: `You've analyzed ${group.length} ${group.length === 1 ? "posting" : "postings"} for this role, and your strongest fit came out at ${best.fitScore}/100. Measured against the real requirements, not an estimate.`,
      currentFit: best.fitScore,
      isMeasured: true,
      requiredSkills,
      matchedSkills: requiredSkills.filter((r) => confirmed.some((s) => skillsMatch(s.name, r))),
      typicalEntryRoute: "You already have real postings for this role in Work-ly. Open them to see exactly which requirements you meet.",
      relevantJobCount: group.length,
      relevantJobTitles: group
        .slice(0, 5)
        .map((o) => `${o.job.title ?? "Untitled role"}${o.job.company ? ` at ${o.job.company}` : ""}`),
    });
    seen.add(key);
  }

  // --- Source 2: curated adjacencies --------------------------------------
  for (const entry of ADJACENCY_TABLE) {
    const key = normalize(entry.role);
    if (seen.has(key)) continue;
    if (currentTarget && key === normalize(currentTarget)) continue;

    const isAdjacent = entry.from.some((from) => keywords.some((k) => k.includes(from)));
    if (!isAdjacent) continue;

    const matched = matchSkills(entry.coreSkills, confirmed);
    // Indicative fit: how much of the role's core skill set they already
    // hold. Deliberately NOT presented with the same authority as a
    // measured fit - see isMeasured.
    const indicativeFit = Math.round((matched.length / entry.coreSkills.length) * 100);

    const relevant = opportunities.filter((o) => o.job.title && normalize(o.job.title).includes(key));

    results.push({
      role: entry.role,
      whyItFits:
        matched.length > 0
          ? `Your background overlaps with this field, and you already have ${matched.length} of its ${entry.coreSkills.length} core skills: ${matched.join(", ")}.`
          : "Your background is adjacent to this field, though none of its core skills are on your profile yet.",
      currentFit: indicativeFit,
      isMeasured: false,
      requiredSkills: entry.coreSkills,
      matchedSkills: matched,
      typicalEntryRoute: entry.entryRoute,
      relevantJobCount: relevant.length,
      relevantJobTitles: relevant
        .slice(0, 5)
        .map((o) => `${o.job.title ?? "Untitled role"}${o.job.company ? ` at ${o.job.company}` : ""}`),
    });
    seen.add(key);
  }

  // Measured fits first (they're trustworthy), then by fit descending.
  return results
    .sort((a, b) => {
      if (a.isMeasured !== b.isMeasured) return a.isMeasured ? -1 : 1;
      return b.currentFit - a.currentFit;
    })
    .slice(0, 6);
}
