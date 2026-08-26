// Hand-typed mirrors of the Prisma models in prisma/schema.prisma.
// Keep these in sync with the schema until the interim query layer
// (see pool.ts) is retired in favor of the generated Prisma Client.

export type CareerGoalStatus = "ACTIVE" | "ACHIEVED" | "PAUSED" | "ARCHIVED";

export type DocumentType = "PDF" | "DOCX";
export type DocumentStatus = "UPLOADED" | "PARSING" | "PARSED" | "FAILED";

/// Where a piece of profile data came from - kept visible everywhere so a
/// fact (CV, USER, PROJECT, CERTIFICATION) is never confused with an
/// AI_INFERENCE.
export type DataSource = "CV" | "USER" | "PROJECT" | "CERTIFICATION" | "AI_INFERENCE";

export type SkillCategory = "TECHNICAL" | "SOFT" | "DOMAIN" | "TOOL" | "LANGUAGE" | "OTHER";
export type SkillProficiency = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
export type SkillExperienceLevel =
  | "UNDER_1_YEAR"
  | "ONE_TO_3_YEARS"
  | "THREE_TO_5_YEARS"
  | "FIVE_PLUS_YEARS";
export type SkillEvidenceLevel = "STATED" | "DEMONSTRATED" | "CERTIFIED" | "INFERRED";
export type SkillRecency = "CURRENT" | "WITHIN_1_YEAR" | "WITHIN_3_YEARS" | "OVER_3_YEARS" | "UNKNOWN";

export interface User {
  id: string;
  email: string;
  passwordHash: string | null;
  name: string | null;
  avatarUrl: string | null;
  onboardedAt: Date | null;
  emailVerified: boolean;
  verificationToken: string | null;
  verificationTokenExpiresAt: Date | null;
  verificationCodeHash: string | null;
  verificationCodeExpiresAt: Date | null;
  verificationAttempts: number;
  resetPasswordToken: string | null;
  resetPasswordTokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CareerProfile {
  id: string;
  userId: string;
  headline: string | null;
  summary: string | null;
  location: string | null;
  currentRole: string | null;
  currentCompany: string | null;
  yearsExperience: number | null;
  skills: string[];
  resumeFileName: string | null;
  resumeFileUrl: string | null;
  resumeUploadedAt: Date | null;
  parsedData: unknown | null;
  /** Student mode. studentCountry is what makes work-hour limits showable. */
  isStudent: boolean;
  university: string | null;
  major: string | null;
  expectedGraduation: string | null;
  studentCountry: string | null;
  /** Account-level location preferences. `location` above is the home base. */
  preferredLocations: string[];
  openToRemote: boolean;
  isPartTimeMode?: boolean;
  availability?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  userId: string;
  fileName: string;
  fileType: DocumentType;
  fileSizeBytes: number;
  storageKey: string;
  status: DocumentStatus;
  errorMessage: string | null;
  uploadedAt: Date;
  parsedAt: Date | null;
}

interface SourcedEntity {
  source: DataSource;
  isUncertain: boolean;
}

export interface Education extends SourcedEntity {
  id: string;
  careerProfileId: string;
  institution: string;
  degree: string | null;
  fieldOfStudy: string | null;
  startDate: Date | null;
  endDate: Date | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Experience extends SourcedEntity {
  id: string;
  careerProfileId: string;
  company: string;
  title: string;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
  isCurrent: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project extends SourcedEntity {
  id: string;
  careerProfileId: string;
  name: string;
  role: string | null;
  description: string | null;
  url: string | null;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Skill {
  id: string;
  careerProfileId: string;
  name: string;
  category: SkillCategory;
  proficiency: SkillProficiency | null;
  experienceLevel: SkillExperienceLevel | null;
  evidenceLevel: SkillEvidenceLevel;
  source: DataSource;
  recency: SkillRecency;
  isTransferable: boolean;
  transferableRationale: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Achievement extends SourcedEntity {
  id: string;
  careerProfileId: string;
  title: string;
  description: string | null;
  date: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Certification extends SourcedEntity {
  id: string;
  careerProfileId: string;
  name: string;
  issuer: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  credentialUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkMode = "REMOTE" | "HYBRID" | "ONSITE";
export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
export type SeniorityLevel = "ENTRY" | "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "PRINCIPAL" | "EXECUTIVE";

export interface CareerGoal {
  id: string;
  userId: string;
  title: string;
  targetRole: string | null;
  targetIndustry: string | null;
  timeframe: string | null;
  notes: string | null;
  status: CareerGoalStatus;

  primaryTargetRole: string | null;
  secondaryTargetRoles: string[];
  industries: string[];
  preferredLocations: string[];
  countries: string[];
  workModes: WorkMode[];
  employmentTypes: EmploymentType[];
  seniority: SeniorityLevel | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  isUncertain: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export type JobInputMethod = "PASTED_TEXT" | "URL";
export type JobStatus = "PARSING" | "PARSED" | "FAILED";

export interface RequirementItem {
  text: string;
  mandatory: boolean;
  category: "skill" | "experience" | "education" | "other";
}

export interface Job {
  id: string;
  userId: string;
  inputMethod: JobInputMethod;
  url: string | null;
  rawInput: string;
  status: JobStatus;
  errorMessage: string | null;

  title: string | null;
  company: string | null;
  location: string | null;
  country: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  employmentType: EmploymentType | null;
  workMode: WorkMode | null;
  seniority: SeniorityLevel | null;
  description: string | null;
  requiredExperienceYears: number | null;
  preferredExperienceYears: number | null;
  education: string | null;
  industry: string | null;
  deadline: Date | null;
  datePosted: Date | null;
  source: string | null;

  requiredSkills: string[];
  preferredSkills: string[];
  requirements: RequirementItem[];

  createdAt: Date;
  updatedAt: Date;
}

export type RecommendationType = "APPLY_NOW" | "APPLY" | "STRETCH" | "LOW_PRIORITY" | "SKIP";
export type GapType =
  | "SKILL_GAP"
  | "EXPERIENCE_GAP"
  | "EVIDENCE_GAP"
  | "PORTFOLIO_GAP"
  | "CREDENTIAL_GAP"
  | "SENIORITY_GAP"
  | "POSITIONING_GAP";

/**
 * How much this component's score is worth believing.
 *
 *   measured    - derived from real data on both sides of the comparison.
 *   assumed     - a documented default, used where one is defensible.
 *   unavailable - could not be assessed. Scores 0 but is excluded from the
 *                 denominator, so it never costs the user points.
 *
 * This field exists because its absence was the single biggest source of
 * false statements in the product. Without it, "we have no data" and "you
 * scored zero" were the same value.
 */
export type ScoreConfidence = "measured" | "assumed" | "unavailable";

export interface ScoreComponent {
  score: number;
  maxScore: number;
  weight: number;
  reasoning: string;
  /** Optional for backward compatibility with analyses saved before this existed. */
  confidence?: ScoreConfidence;
}

export type ScoreBreakdown = {
  skills: ScoreComponent;
  experience: ScoreComponent;
  education: ScoreComponent;
  industryRelevance: ScoreComponent;
  seniority: ScoreComponent;
  location: ScoreComponent;
  evidence: ScoreComponent;
}

export interface GapItem {
  type: GapType;
  title: string;
  description: string;
}

/**
 * Whether the candidate meets one stated requirement.
 *
 * Tri-state, not boolean. "We could not check this automatically" used to
 * be stored as `met: false`, identical to "you do not meet this", and then
 * counted as a failure in four separate downstream numbers and two
 * sentences shown to the user. Most real requirement bullets are prose that
 * keyword matching cannot verify, so that turned a limitation of the
 * matcher into an assertion about the person.
 */
export type RequirementStatus = "met" | "not-met" | "unknown";

export interface RequirementCheck {
  text: string;
  status: RequirementStatus;
  detail: string;
}

export interface JobAnalysis {
  id: string;
  userId: string;
  jobId: string;

  fitScore: number;
  competitiveness: "Low" | "Moderate" | "High" | "Insufficient data";
  recommendation: RecommendationType;
  recommendationReasoning: string;
  scoreBreakdown: ScoreBreakdown;

  strengths: string[];
  weaknesses: string[];
  gaps: GapItem[];
  mandatoryRequirements: RequirementCheck[];
  preferredRequirements: RequirementCheck[];
  risks: string[];
  improvements: string[];

  createdAt: Date;
  updatedAt: Date;
}

export type OpportunityStatus = "DISCOVERED" | "PREPARING" | "APPLIED";

/// Per-component breakdown backing Opportunity.priorityScore - see
/// lib/priority/providers/stub.ts. Mirrors ScoreComponent's shape so the
/// UI can render it with the same component used for fit's breakdown.
export type PriorityBreakdown = {
  candidateFit: ScoreComponent;
  careerValue: ScoreComponent;
  competitiveness: ScoreComponent;
  applicationEffort: ScoreComponent;
  salary: ScoreComponent;
  location: ScoreComponent;
  careerProgression: ScoreComponent;
  userPreferences: ScoreComponent;
}

/// The trackable wrapper around one analyzed Job - see schema.prisma for
/// the "Fit vs Priority" distinction this exists to preserve.
export interface Opportunity {
  id: string;
  userId: string;
  jobId: string;
  jobAnalysisId: string | null;

  fitScore: number;
  recommendation: RecommendationType;
  competitiveness: "Low" | "Moderate" | "High" | "Insufficient data";

  priorityScore: number;
  priorityBreakdown: PriorityBreakdown;

  isSaved: boolean;
  status: OpportunityStatus;

  discoveredAt: Date;
  lastAnalyzedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

/// An Opportunity joined with the Job + JobAnalysis fields the UI needs,
/// so the opportunities list/detail pages don't have to do three separate
/// round trips per row.
export interface OpportunityWithJob extends Opportunity {
  job: Job;
  analysis: JobAnalysis | null;
}

// ---------------------------------------------------------------------------
// DREAM JOB ANALYZER & CAREER GAP ENGINE - Phase 5
// ---------------------------------------------------------------------------

export type DreamJobStatus = "PARSING" | "PARSED" | "FAILED";

/// A user's aspirational target role - mirrors Job's extracted-field shape
/// exactly (same parser, same fields) so the same scoringProvider.analyzeFit
/// can be reused, unmodified, to compute Readiness. See lib/dream-job/to-job-like.ts.
export interface DreamJob {
  id: string;
  userId: string;

  dreamRole: string;
  companyName: string | null;
  portfolio: string | null;
  rawInput: string;

  status: DreamJobStatus;
  errorMessage: string | null;

  title: string | null;
  company: string | null;
  location: string | null;
  country: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  employmentType: EmploymentType | null;
  workMode: WorkMode | null;
  seniority: SeniorityLevel | null;
  description: string | null;
  requiredExperienceYears: number | null;
  preferredExperienceYears: number | null;
  education: string | null;
  industry: string | null;
  deadline: Date | null;
  datePosted: Date | null;
  source: string | null;

  requiredSkills: string[];
  preferredSkills: string[];
  requirements: RequirementItem[];

  createdAt: Date;
  updatedAt: Date;
}

export type GapImpact = "HIGH" | "MEDIUM" | "LOW";
export type GapDifficulty = "LOW" | "MEDIUM" | "HIGH";

/// Ranked gap prioritization - never a flat dump of missing skills. Every
/// affectedOpportunityCount traces back to real Opportunity rows the user
/// already has (see lib/dream-job/gap-engine.ts), never a fabricated figure.
export interface GapPriority {
  gapType: GapType;
  title: string;
  description: string;
  impact: GapImpact;
  difficulty: GapDifficulty;
  estimatedTime: string;
  affectedOpportunityCount: number;
  affectedOpportunityIds: string[];
}

export type CvImprovementArea =
  | "missing_information"
  | "weak_evidence"
  | "poor_ordering"
  | "generic_language"
  | "unquantified_achievements"
  | "missing_experience";

/// Every suggestion traces to a real comparison against the target job text
/// or the user's own profile text - never fabricated. See "Add a metric if
/// you can substantiate one." pattern in lib/dream-job/gap-engine.ts.
export interface CvImprovement {
  area: CvImprovementArea;
  issue: string;
  suggestion: string;
}

/// "What not to change" - the strong parts of the profile, so improvement
/// suggestions don't read as "everything is wrong."
export interface KeepItem {
  title: string;
  reason: string;
}

export type ImprovementTier = "HIGH" | "MEDIUM" | "LOW";

export interface ImprovementPlanItem {
  tier: ImprovementTier;
  title: string;
  why: string;
  impact: string;
  effort: string;
  relevantJobs: string[];
}

export interface ProjectRecommendation {
  project: string;
  why: string;
  skillsDemonstrated: string[];
  deliverables: string[];
  difficulty: GapDifficulty;
  estimatedTime: string;
  relevantTargetJobs: string[];
  portfolioPresentation: string;
}

/// The result of comparing one CareerProfile (+ the user's real
/// Opportunities, for grounding "N jobs this would unlock" claims) against
/// one DreamJob. readinessScore/competitiveness/scoreBreakdown/strengths/
/// weaknesses/gaps/mandatoryRequirements/preferredRequirements reuse
/// JobAnalysis's exact shape - readinessScore IS fitScore, relabeled, never
/// a hire-probability claim.
export interface DreamJobAnalysis {
  id: string;
  userId: string;
  dreamJobId: string;

  readinessScore: number;
  competitiveness: "Low" | "Moderate" | "High" | "Insufficient data";
  scoreBreakdown: ScoreBreakdown;

  strengths: string[];
  weaknesses: string[];
  gaps: GapItem[];

  mandatoryRequirements: RequirementCheck[];
  preferredRequirements: RequirementCheck[];

  gapPriorities: GapPriority[];
  cvImprovements: CvImprovement[];
  keepAsIs: KeepItem[];
  improvementPlan: ImprovementPlanItem[];
  projectRecommendations: ProjectRecommendation[];
  biggestObstacles: string[];
  highestImpactNextStep: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface DreamJobWithAnalysis extends DreamJob {
  analysis: DreamJobAnalysis | null;
}

// ---------------------------------------------------------------------------
// CAREER PATHWAY ENGINE - Phase 6
// ---------------------------------------------------------------------------

export type PathwayStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

/// PENDING | COMPLETED | SKIPPED - skipping is deliberately distinct from
/// deleting: "I considered this and chose not to" is real information.
export type PathwayItemStatus = "PENDING" | "COMPLETED" | "SKIPPED";

export type ActionWindow = "DAYS_0_30" | "DAYS_31_60" | "DAYS_61_90";

/// An ordered route from current state to a target role, generated from a
/// DreamJobAnalysis's ranked gaps so pathway and gap analysis can never
/// disagree about what's missing.
export interface CareerPathway {
  id: string;
  userId: string;
  dreamJobId: string | null;

  currentStateLabel: string;
  targetStateLabel: string;
  /// Candidate Fit at generation time - never a hiring probability.
  startingReadiness: number;

  status: PathwayStatus;

  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/// One milestone between current and target state.
export interface PathwayStep {
  id: string;
  pathwayId: string;

  order: number;
  title: string;
  description: string;

  gapType: GapType | null;
  relatedSkill: string | null;

  status: PathwayItemStatus;
  note: string | null;

  /// Counted from the user's real Opportunity rows, never estimated - the
  /// "could unlock N more opportunities" claim is only shown when N came
  /// from the database.
  unlockedOpportunityCount: number;
  unlockedOpportunityIds: string[];

  projectRecommendation: ProjectRecommendation | null;

  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/// A concrete, time-boxed action in the 30/60/90 plan. A step is the
/// milestone; an action is something you actually do this month toward it.
export interface PathwayAction {
  id: string;
  pathwayId: string;
  stepId: string | null;

  window: ActionWindow;
  order: number;

  title: string;
  description: string;
  /// 1 = highest priority.
  priority: number;
  estimatedTime: string;
  difficulty: string;
  expectedImpact: string;

  relatedSkill: string | null;
  relatedTargetJobs: string[];

  status: PathwayItemStatus;
  note: string | null;

  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/// A pathway with everything the /career-path page renders in one object.
export interface FullPathway extends CareerPathway {
  steps: PathwayStep[];
  actions: PathwayAction[];
}

// ---------------------------------------------------------------------------
// APPLICATION TRACKING & OUTCOME ANALYTICS - Phase 7
// ---------------------------------------------------------------------------

export type ApplicationStatus =
  | "SAVED"
  | "PREPARING"
  | "APPLIED"
  | "ASSESSMENT"
  | "INTERVIEW"
  | "FINAL_INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

/// How it ended, as distinct from where it currently sits. An application
/// can be REJECTED (status) having reached INTERVIEW on the way.
export type ApplicationOutcome = "PENDING" | "REJECTED" | "OFFER" | "WITHDRAWN";

export interface ApplicationContact {
  name: string;
  role?: string;
  email?: string;
  notes?: string;
}

export interface ApplicationInterview {
  /// ISO date string.
  date: string;
  kind: string;
  notes?: string;
}

export interface Application {
  id: string;
  userId: string;

  opportunityId: string | null;
  jobId: string | null;
  jobAnalysisId: string | null;

  roleTitle: string;
  company: string | null;
  industry: string | null;
  location: string | null;
  country: string | null;

  /// Snapshotted when the application was created, NOT read live. See the
  /// schema comment - reading live scores would corrupt the correlation
  /// between what Workly predicted and what actually happened.
  fitScoreAtApply: number | null;
  priorityScoreAtApply: number | null;

  status: ApplicationStatus;
  outcome: ApplicationOutcome;

  dateApplied: Date | null;

  /// Set once when first reached, never cleared - this is what makes
  /// interview rate correct for applications that were later rejected.
  reachedAssessmentAt: Date | null;
  reachedInterviewAt: Date | null;
  reachedOfferAt: Date | null;
  closedAt: Date | null;

  cvVersion: string | null;
  coverLetter: string | null;
  notes: string | null;

  contacts: ApplicationContact[];
  interviews: ApplicationInterview[];

  salaryOffered: number | null;
  salaryCurrency: string | null;

  createdAt: Date;
  updatedAt: Date;
}

/// An application joined with its source job, for the detail page.
export interface ApplicationWithJob extends Application {
  job: Job | null;
  analysis: JobAnalysis | null;
  opportunity: Opportunity | null;
}

// ---------------------------------------------------------------------------
// DEEP JOB DISCOVERY ENGINE - Phase 8
// ---------------------------------------------------------------------------

export type JobSourceKind =
  | "COMPANY_CAREER"
  | "PUBLIC_JOB_BOARD"
  | "GOVERNMENT"
  | "UNIVERSITY"
  | "EMPLOYER_FEED"
  | "API_PROVIDER"
  | "MANUAL_IMPORT"
  | "DEMO";

export type JobSourceStatus = "ACTIVE" | "DISABLED" | "NEEDS_CREDENTIALS" | "ERROR";
export type DiscoveryRunStatus = "RUNNING" | "COMPLETED" | "FAILED";

export interface JobSourceConfig {
  id: string;
  userId: string;
  kind: JobSourceKind;
  name: string;
  config: Record<string, unknown>;
  status: JobSourceStatus;
  errorMessage: string | null;
  /// Written justification for ingesting from this source - auditable, not assumed.
  legalBasis: string;
  lastRunAt: Date | null;
  lastRunFoundCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/// Why a job surfaced, shown to the user verbatim.
export interface MatchReason {
  text: string;
  kind: "skill" | "seniority" | "location" | "preference" | "expansion" | "source";
}

export interface DiscoveredJob {
  id: string;
  userId: string;
  sourceConfigId: string | null;

  sourceKind: JobSourceKind;
  sourceName: string;
  sourceUrl: string | null;
  externalId: string;
  discoveredAt: Date;
  postedAt: Date | null;

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

  dedupeKey: string;
  duplicateOfId: string | null;

  /// Stored so search never recomputes embeddings on page load.
  embedding: number[];
  embeddingModel: string | null;

  /// Cached during the discovery run - never computed per request.
  fitScore: number | null;
  recommendation: RecommendationType | null;
  matchReasons: MatchReason[];
  discoveryReason: string | null;

  isDismissed: boolean;
  convertedOpportunityId: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface DiscoveryRun {
  id: string;
  userId: string;
  status: DiscoveryRunStatus;
  query: string | null;
  sourcesRun: number;
  rawFound: number;
  duplicatesFolded: number;
  newJobs: number;
  newHighPriority: number;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}
