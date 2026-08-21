// From text-utils, not discovery/normalize - the role graph is used by the
// client-side search engine, and discovery/normalize is server-only.
import { canonical } from "@/lib/text-utils";

/**
 * HIDDEN ROLE DISCOVERY
 *
 * The problem this solves: someone searches "documentary filmmaking" and
 * gets nothing, because almost no job is titled that. The roles that
 * actually exist are Documentary Producer, Story Producer, Creative
 * Producer, Production Coordinator, Documentary Researcher - and a
 * keyword search finds none of them.
 *
 * WHY A CURATED GRAPH RATHER THAN EMBEDDINGS
 *
 * The default embedding provider is lexical (see embeddings.ts), so it
 * cannot know "Story Producer" relates to documentary work - the words
 * barely overlap. Even a real semantic model would be a poor fit here: it
 * would happily return plausible-sounding but wrong adjacencies with no
 * way to audit or correct them. An explicit graph is smaller, inspectable,
 * correctable, and every edge can be justified.
 *
 * THE PROFILE GATE - the part that matters most
 *
 * The spec is specific: expand "only when the relationship is actually
 * relevant to the user's profile". Without that, expansion is actively
 * harmful. Someone searching "producer" who has spent ten years in film
 * should see Story Producer. Someone searching "producer" from a
 * manufacturing background should not - for them the word means something
 * else entirely, and burying their results under television jobs is worse
 * than returning nothing.
 *
 * So every expansion is scored against the profile, and edges that don't
 * clear the bar are dropped. `expandQuery` reports which relationships
 * survived and why, so the UI can tell the user exactly why an unexpected
 * role appeared.
 */

export interface RoleCluster {
  /** What a user might type. */
  aliases: string[];
  /** Real job titles in this space. */
  roles: string[];
  /** Skills/keywords that indicate a profile genuinely belongs to this cluster. */
  affinitySignals: string[];
  /** Plain-language explanation shown to the user. */
  rationale: string;
}

/**
 * Deliberately shallow and hand-written. A short, correct graph beats a
 * long speculative one - every cluster here is a relationship a person in
 * that field would recognise immediately.
 */
export const ROLE_CLUSTERS: RoleCluster[] = [
  {
    aliases: ["documentary filmmaking", "documentary", "documentary film", "factual television", "docs"],
    roles: [
      "Documentary Producer",
      "Story Producer",
      "Creative Producer",
      "Production Coordinator",
      "Documentary Researcher",
      "Assistant Producer",
      "Series Producer",
    ],
    affinitySignals: [
      "film", "video", "production", "editing", "storytelling", "research", "journalism",
      "media", "broadcast", "documentary", "camera", "interview", "archive", "script",
    ],
    rationale:
      "Documentary work is almost never advertised under that phrase. It's advertised as producer, researcher and coordinator roles.",
  },
  {
    aliases: ["data analysis", "analytics", "data analyst", "analyst"],
    roles: [
      "Data Analyst",
      "Product Analyst",
      "Business Analyst",
      "Analytics Engineer",
      "Research Analyst",
      "Insights Analyst",
      "Operations Analyst",
    ],
    affinitySignals: [
      "sql", "excel", "python", "tableau", "power bi", "dashboard", "reporting", "statistics",
      "analysis", "data", "metrics", "experimentation", "a/b testing", "dbt",
    ],
    rationale:
      "Analytics roles are titled inconsistently across companies. The same work appears as product, business, insights or operations analyst.",
  },
  {
    aliases: ["policy", "public policy", "policy research", "think tank"],
    roles: [
      "Policy Analyst",
      "Research Analyst",
      "Policy Adviser",
      "Research Associate",
      "Public Affairs Manager",
    ],
    affinitySignals: [
      "research", "policy", "economics", "statistics", "writing", "government", "public",
      "quantitative", "qualitative", "briefing", "stakeholder",
    ],
    rationale:
      "Policy work sits across think tanks, government and NGOs under several different titles.",
  },
  {
    aliases: ["product management", "product manager", "product"],
    roles: ["Product Manager", "Product Owner", "Technical Product Manager", "Product Analyst", "Programme Manager"],
    affinitySignals: [
      "roadmap", "stakeholder", "prioritization", "prioritisation", "user research", "product",
      "backlog", "discovery", "requirements", "launch",
    ],
    rationale: "Product roles vary in title by company size and sector but share the same core work.",
  },
  {
    aliases: ["user research", "ux research", "design research"],
    roles: ["UX Researcher", "User Researcher", "Design Researcher", "Insights Researcher", "Product Analyst"],
    affinitySignals: [
      "usability", "interview", "research", "survey", "synthesis", "user", "qualitative",
      "ethnography", "persona", "testing",
    ],
    rationale: "Research roles in product organisations are titled several different ways for the same work.",
  },
  {
    aliases: ["devops", "infrastructure", "platform engineering", "sre"],
    roles: [
      "DevOps Engineer",
      "Site Reliability Engineer",
      "Platform Engineer",
      "Infrastructure Engineer",
      "Cloud Engineer",
    ],
    affinitySignals: [
      "kubernetes", "docker", "terraform", "aws", "gcp", "azure", "ci/cd", "cloud",
      "infrastructure", "deployment", "monitoring", "linux",
    ],
    rationale: "Infrastructure work is advertised under at least five different titles for essentially one job.",
  },
  {
    aliases: ["software engineering", "software developer", "engineer", "programming"],
    roles: [
      "Software Engineer",
      "Backend Engineer",
      "Frontend Engineer",
      "Full Stack Engineer",
      "Solutions Engineer",
    ],
    affinitySignals: [
      "javascript", "typescript", "python", "java", "react", "node", "api", "git",
      "programming", "software", "engineering", "testing",
    ],
    rationale: "Engineering titles split by stack and seniority but overlap heavily in practice.",
  },
];

/** How strongly a profile belongs to a cluster, 0-1. */
export function affinityScore(cluster: RoleCluster, profileText: string): number {
  const haystack = canonical(profileText);
  if (!haystack) return 0;
  const hits = cluster.affinitySignals.filter((signal) => haystack.includes(canonical(signal)));
  // Scaled against a realistic ceiling rather than the full signal list -
  // nobody's profile mentions all fourteen documentary keywords, and
  // requiring that would make the gate impossible to pass.
  return Math.min(1, hits.length / Math.min(4, cluster.affinitySignals.length));
}

export interface ExpandedRole {
  role: string;
  /** Which cluster produced it. */
  cluster: string;
  /** Shown to the user as "why we found this". */
  rationale: string;
  affinity: number;
}

export interface QueryExpansion {
  /** The literal terms the user typed, always searched. */
  literalTerms: string[];
  /** Related roles the profile justifies, possibly empty. */
  expandedRoles: ExpandedRole[];
  /** Clusters that matched the query but were rejected for lack of profile relevance. */
  suppressed: { cluster: string; affinity: number; reason: string }[];
}

/// Below this, the profile doesn't support the expansion and it's dropped.
/// Set so a profile needs at least one clear signal from the cluster, not
/// merely a coincidental word.
const MIN_AFFINITY = 0.25;

/**
 * Expands a query into related roles, gated on profile relevance.
 *
 * Returns the suppressed clusters too - not to display prominently, but
 * because "we could have expanded this and chose not to" is genuinely
 * useful when debugging why an expected result didn't appear.
 */
export function expandQuery(query: string, profileText: string): QueryExpansion {
  const normalizedQuery = canonical(query);
  const literalTerms = normalizedQuery.split(" ").filter((term) => term.length > 2);

  if (!normalizedQuery) {
    return { literalTerms: [], expandedRoles: [], suppressed: [] };
  }

  const expandedRoles: ExpandedRole[] = [];
  const suppressed: QueryExpansion["suppressed"] = [];

  for (const cluster of ROLE_CLUSTERS) {
    const matchesQuery = cluster.aliases.some((alias) => {
      const canonicalAlias = canonical(alias);
      return normalizedQuery.includes(canonicalAlias) || canonicalAlias.includes(normalizedQuery);
    });
    if (!matchesQuery) continue;

    const affinity = affinityScore(cluster, profileText);

    if (affinity < MIN_AFFINITY) {
      suppressed.push({
        cluster: cluster.aliases[0],
        affinity,
        reason:
          "Your profile doesn't show experience in this area, so related roles weren't added. They'd have buried what you actually searched for.",
      });
      continue;
    }

    for (const role of cluster.roles) {
      // Don't "expand" to something the user already typed.
      if (canonical(role) === normalizedQuery) continue;
      expandedRoles.push({
        role,
        cluster: cluster.aliases[0],
        rationale: cluster.rationale,
        affinity,
      });
    }
  }

  return { literalTerms, expandedRoles, suppressed };
}
