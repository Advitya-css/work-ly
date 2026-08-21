import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import type {
  Application,
  ApplicationContact,
  ApplicationInterview,
  ApplicationOutcome,
  ApplicationStatus,
} from "./types";

function mapRow(row: Record<string, unknown>): Application {
  return {
    id: row.id as string,
    userId: row.userId as string,

    opportunityId: (row.opportunityId as string | null) ?? null,
    jobId: (row.jobId as string | null) ?? null,
    jobAnalysisId: (row.jobAnalysisId as string | null) ?? null,

    roleTitle: row.roleTitle as string,
    company: (row.company as string | null) ?? null,
    industry: (row.industry as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    country: (row.country as string | null) ?? null,

    fitScoreAtApply: (row.fitScoreAtApply as number | null) ?? null,
    priorityScoreAtApply: (row.priorityScoreAtApply as number | null) ?? null,

    status: row.status as ApplicationStatus,
    outcome: row.outcome as ApplicationOutcome,

    dateApplied: (row.dateApplied as Date | null) ?? null,
    reachedAssessmentAt: (row.reachedAssessmentAt as Date | null) ?? null,
    reachedInterviewAt: (row.reachedInterviewAt as Date | null) ?? null,
    reachedOfferAt: (row.reachedOfferAt as Date | null) ?? null,
    closedAt: (row.closedAt as Date | null) ?? null,

    cvVersion: (row.cvVersion as string | null) ?? null,
    coverLetter: (row.coverLetter as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,

    contacts: (row.contacts as ApplicationContact[] | null) ?? [],
    interviews: (row.interviews as ApplicationInterview[] | null) ?? [],

    salaryOffered: (row.salaryOffered as number | null) ?? null,
    salaryCurrency: (row.salaryCurrency as string | null) ?? null,

    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function listApplicationsByUserId(userId: string): Promise<Application[]> {
  const { rows } = await pool.query(
    `SELECT * FROM applications WHERE "userId" = $1 ORDER BY COALESCE("dateApplied", "createdAt") DESC`,
    [userId],
  );
  return rows.map(mapRow);
}

export async function getApplicationById(id: string): Promise<Application | null> {
  const { rows } = await pool.query(`SELECT * FROM applications WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getApplicationByOpportunityId(opportunityId: string): Promise<Application | null> {
  const { rows } = await pool.query(`SELECT * FROM applications WHERE "opportunityId" = $1 LIMIT 1`, [
    opportunityId,
  ]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export interface CreateApplicationInput {
  opportunityId?: string | null;
  jobId?: string | null;
  jobAnalysisId?: string | null;
  roleTitle: string;
  company?: string | null;
  industry?: string | null;
  location?: string | null;
  country?: string | null;
  fitScoreAtApply?: number | null;
  priorityScoreAtApply?: number | null;
  status?: ApplicationStatus;
  dateApplied?: Date | null;
  cvVersion?: string | null;
}

/**
 * Creating an application also back-fills the milestone timestamps implied
 * by its starting status. Someone logging a role they already interviewed
 * for shouldn't have to click through every intermediate column just to
 * make the interview rate come out right.
 */
export async function createApplication(
  userId: string,
  input: CreateApplicationInput,
): Promise<Application> {
  const id = randomUUID();
  const status = input.status ?? "APPLIED";
  const milestones = milestonesFor(status);

  const { rows } = await pool.query(
    `INSERT INTO applications (
       id, "userId", "opportunityId", "jobId", "jobAnalysisId",
       "roleTitle", company, industry, location, country,
       "fitScoreAtApply", "priorityScoreAtApply",
       status, outcome, "dateApplied",
       "reachedAssessmentAt", "reachedInterviewAt", "reachedOfferAt", "closedAt",
       "cvVersion", "updatedAt"
     )
     VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9, $10,
       $11, $12,
       $13::"ApplicationStatus", $14::"ApplicationOutcome", $15,
       $16, $17, $18, $19,
       $20, now()
     )
     RETURNING *`,
    [
      id,
      userId,
      input.opportunityId ?? null,
      input.jobId ?? null,
      input.jobAnalysisId ?? null,
      input.roleTitle,
      input.company ?? null,
      input.industry ?? null,
      input.location ?? null,
      input.country ?? null,
      input.fitScoreAtApply ?? null,
      input.priorityScoreAtApply ?? null,
      status,
      outcomeFor(status),
      input.dateApplied ?? (statusIsAtOrPastApplied(status) ? new Date() : null),
      milestones.assessment,
      milestones.interview,
      milestones.offer,
      milestones.closed,
      input.cvVersion ?? null,
    ],
  );
  return mapRow(rows[0]);
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

const STAGE_ORDER: ApplicationStatus[] = [
  "SAVED",
  "PREPARING",
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER",
];

function stageIndex(status: ApplicationStatus): number {
  return STAGE_ORDER.indexOf(status);
}

function statusIsAtOrPastApplied(status: ApplicationStatus): boolean {
  const index = stageIndex(status);
  return index >= stageIndex("APPLIED") || status === "REJECTED";
}

function outcomeFor(status: ApplicationStatus): ApplicationOutcome {
  if (status === "REJECTED") return "REJECTED";
  if (status === "WITHDRAWN") return "WITHDRAWN";
  if (status === "OFFER") return "OFFER";
  return "PENDING";
}

/**
 * Which milestones a given status implies have already happened. Moving
 * straight to OFFER means assessment and interview were passed through,
 * even if the user never clicked those columns.
 */
function milestonesFor(status: ApplicationStatus) {
  const now = new Date();
  const index = stageIndex(status);
  const terminal = status === "REJECTED" || status === "WITHDRAWN";
  return {
    assessment: index >= stageIndex("ASSESSMENT") ? now : null,
    interview: index >= stageIndex("INTERVIEW") ? now : null,
    offer: index >= stageIndex("OFFER") ? now : null,
    closed: terminal ? now : null,
  };
}

/**
 * Moves an application to a new status.
 *
 * Milestone columns are only ever set, never cleared - COALESCE keeps any
 * existing timestamp. That is the whole point of them: an application that
 * reached INTERVIEW and was then REJECTED must still count toward the
 * interview rate, and would not if the timestamp were reset on the way out.
 */
export async function setApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<Application> {
  const milestones = milestonesFor(status);
  const { rows } = await pool.query(
    `UPDATE applications SET
       status  = $2::"ApplicationStatus",
       outcome = $3::"ApplicationOutcome",
       "dateApplied" = COALESCE("dateApplied", CASE WHEN $4::boolean THEN now() ELSE NULL END),
       "reachedAssessmentAt" = COALESCE("reachedAssessmentAt", $5),
       "reachedInterviewAt"  = COALESCE("reachedInterviewAt",  $6),
       "reachedOfferAt"      = COALESCE("reachedOfferAt",      $7),
       "closedAt"            = CASE WHEN $8::boolean THEN COALESCE("closedAt", now()) ELSE NULL END,
       "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      status,
      outcomeFor(status),
      statusIsAtOrPastApplied(status),
      milestones.assessment,
      milestones.interview,
      milestones.offer,
      status === "REJECTED" || status === "WITHDRAWN",
    ],
  );
  return mapRow(rows[0]);
}

export interface UpdateApplicationInput {
  cvVersion?: string | null;
  coverLetter?: string | null;
  notes?: string | null;
  dateApplied?: Date | null;
  salaryOffered?: number | null;
  salaryCurrency?: string | null;
  contacts?: ApplicationContact[];
  interviews?: ApplicationInterview[];
}

export async function updateApplication(
  id: string,
  fields: UpdateApplicationInput,
): Promise<Application> {
  const { rows } = await pool.query(
    `UPDATE applications SET
       "cvVersion"   = CASE WHEN $2::boolean  THEN $3  ELSE "cvVersion"   END,
       "coverLetter" = CASE WHEN $4::boolean  THEN $5  ELSE "coverLetter" END,
       notes         = CASE WHEN $6::boolean  THEN $7  ELSE notes         END,
       "dateApplied" = CASE WHEN $8::boolean  THEN $9  ELSE "dateApplied" END,
       "salaryOffered"  = CASE WHEN $10::boolean THEN $11 ELSE "salaryOffered"  END,
       "salaryCurrency" = CASE WHEN $12::boolean THEN $13 ELSE "salaryCurrency" END,
       contacts   = CASE WHEN $14::boolean THEN $15::jsonb ELSE contacts   END,
       interviews = CASE WHEN $16::boolean THEN $17::jsonb ELSE interviews END,
       "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      fields.cvVersion !== undefined, fields.cvVersion ?? null,
      fields.coverLetter !== undefined, fields.coverLetter ?? null,
      fields.notes !== undefined, fields.notes ?? null,
      fields.dateApplied !== undefined, fields.dateApplied ?? null,
      fields.salaryOffered !== undefined, fields.salaryOffered ?? null,
      fields.salaryCurrency !== undefined, fields.salaryCurrency ?? null,
      fields.contacts !== undefined, JSON.stringify(fields.contacts ?? []),
      fields.interviews !== undefined, JSON.stringify(fields.interviews ?? []),
    ],
  );
  return mapRow(rows[0]);
}

export async function deleteApplication(id: string): Promise<void> {
  await pool.query(`DELETE FROM applications WHERE id = $1`, [id]);
}
