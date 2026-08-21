import type {
  EmploymentType,
  JobSourceKind,
  JobSourceStatus,
  RequirementItem,
  SeniorityLevel,
  WorkMode,
} from "@/lib/db/types";

/**
 * JOB SOURCE ABSTRACTION
 *
 * Every source of listings implements this one interface, so everything
 * downstream - dedup, embedding, scoring, search, the discovery page -
 * never knows or cares where a job came from.
 *
 * ==========================================================================
 * SCOPE CONSTRAINT
 * ==========================================================================
 * Workly does not scrape LinkedIn, Indeed, Glassdoor, or any service whose
 * terms prohibit automated access. That isn't a soft preference; there is
 * no adapter in this codebase capable of it, and any new adapter must
 * declare a `legalBasis` string explaining the permission it operates
 * under. The permitted categories are:
 *
 *   - APIs published for third-party consumption (an ATS's public board
 *     endpoint, a licensed provider's documented API)
 *   - Feeds an employer publishes precisely so aggregators can read them
 *     (RSS/Atom/JSON careers feeds)
 *   - Public-sector listing services (e.g. USAJOBS)
 *   - Data the user supplied themselves
 *
 * If a proposed source doesn't fit one of those, it doesn't get built.
 */

/** What an adapter returns before normalization - as close to the source's own shape as is useful. */
export interface RawListing {
  /** Stable identifier within the source, used for upserts and dedup. */
  externalId: string;
  title: string;
  company?: string | null;
  location?: string | null;
  country?: string | null;
  description?: string | null;
  url?: string | null;
  postedAt?: Date | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  employmentTypeRaw?: string | null;
  workModeRaw?: string | null;
  seniorityRaw?: string | null;
  industry?: string | null;
  /** Anything the adapter couldn't map; kept for debugging, never shown as fact. */
  extra?: Record<string, unknown>;
}

/** The single internal shape every listing becomes, whatever its origin. */
export interface NormalizedListing {
  externalId: string;
  title: string;
  company: string | null;
  location: string | null;
  country: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  employmentType: EmploymentType | null;
  workMode: WorkMode | null;
  seniority: SeniorityLevel | null;
  industry: string | null;
  description: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  requirements: RequirementItem[];
  sourceUrl: string | null;
  postedAt: Date | null;
  dedupeKey: string;
}

export interface ValidationResult {
  ok: boolean;
  /** Human-readable reasons a listing was rejected. */
  problems: string[];
}

export interface IngestContext {
  /** Free-text the user is searching for, when the run is query-driven. */
  query?: string;
  /** Adapter-specific settings from JobSourceConfig.config. */
  config: Record<string, unknown>;
  /** Caps how much a single source may return in one run. */
  limit: number;
}

export interface SourceStatusUpdate {
  status: JobSourceStatus;
  errorMessage?: string | null;
  foundCount?: number;
}

/**
 * The five methods the Phase 8 spec calls for. `normalize`, `deduplicate`
 * and `validate` are pure and live on the interface so a source CAN
 * override them - but almost none should. The shared implementations in
 * normalize.ts and dedupe.ts are what make cross-source dedup possible at
 * all: two adapters normalizing differently would produce dedupe keys that
 * never match, and the same job would show up twice with no way to tell.
 */
export interface JobSourceAdapter {
  readonly kind: JobSourceKind;
  /** Stable id, e.g. "greenhouse", "usajobs". */
  readonly id: string;
  readonly name: string;
  /** Written justification for ingesting from this source. Required. */
  readonly legalBasis: string;
  /** False when the adapter needs an API key or token that isn't present. */
  isConfigured(config: Record<string, unknown>): boolean;
  /** What the user must supply to enable it, shown in the UI. */
  readonly requires?: string;

  ingest(context: IngestContext): Promise<RawListing[]>;
  normalize(raw: RawListing): NormalizedListing;
  deduplicate(listings: NormalizedListing[]): { unique: NormalizedListing[]; folded: number };
  validate(listing: NormalizedListing): ValidationResult;
  updateStatus(result: { found: number; error?: string }): SourceStatusUpdate;
}
