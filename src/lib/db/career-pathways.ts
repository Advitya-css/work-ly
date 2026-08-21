import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import type {
  ActionWindow,
  CareerPathway,
  GapType,
  PathwayAction,
  PathwayItemStatus,
  PathwayStatus,
  PathwayStep,
  ProjectRecommendation,
} from "./types";

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function mapPathway(row: Record<string, unknown>): CareerPathway {
  return {
    id: row.id as string,
    userId: row.userId as string,
    dreamJobId: (row.dreamJobId as string | null) ?? null,
    currentStateLabel: row.currentStateLabel as string,
    targetStateLabel: row.targetStateLabel as string,
    startingReadiness: row.startingReadiness as number,
    status: row.status as PathwayStatus,
    generatedAt: row.generatedAt as Date,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

function mapStep(row: Record<string, unknown>): PathwayStep {
  return {
    id: row.id as string,
    pathwayId: row.pathwayId as string,
    order: row.order as number,
    title: row.title as string,
    description: row.description as string,
    gapType: (row.gapType as GapType | null) ?? null,
    relatedSkill: (row.relatedSkill as string | null) ?? null,
    status: row.status as PathwayItemStatus,
    note: (row.note as string | null) ?? null,
    unlockedOpportunityCount: row.unlockedOpportunityCount as number,
    unlockedOpportunityIds: (row.unlockedOpportunityIds as string[] | null) ?? [],
    projectRecommendation: (row.projectRecommendation as ProjectRecommendation | null) ?? null,
    completedAt: (row.completedAt as Date | null) ?? null,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

function mapAction(row: Record<string, unknown>): PathwayAction {
  return {
    id: row.id as string,
    pathwayId: row.pathwayId as string,
    stepId: (row.stepId as string | null) ?? null,
    window: row.window as ActionWindow,
    order: row.order as number,
    title: row.title as string,
    description: row.description as string,
    priority: row.priority as number,
    estimatedTime: row.estimatedTime as string,
    difficulty: row.difficulty as string,
    expectedImpact: row.expectedImpact as string,
    relatedSkill: (row.relatedSkill as string | null) ?? null,
    relatedTargetJobs: (row.relatedTargetJobs as string[] | null) ?? [],
    status: row.status as PathwayItemStatus,
    note: (row.note as string | null) ?? null,
    completedAt: (row.completedAt as Date | null) ?? null,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getActivePathwayByUserId(userId: string): Promise<CareerPathway | null> {
  const { rows } = await pool.query(
    `SELECT * FROM career_pathways WHERE "userId" = $1 AND status = 'ACTIVE' ORDER BY "generatedAt" DESC LIMIT 1`,
    [userId],
  );
  return rows[0] ? mapPathway(rows[0]) : null;
}

export async function getPathwayById(id: string): Promise<CareerPathway | null> {
  const { rows } = await pool.query(`SELECT * FROM career_pathways WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapPathway(rows[0]) : null;
}

export async function listStepsByPathwayId(pathwayId: string): Promise<PathwayStep[]> {
  const { rows } = await pool.query(
    `SELECT * FROM pathway_steps WHERE "pathwayId" = $1 ORDER BY "order" ASC`,
    [pathwayId],
  );
  return rows.map(mapStep);
}

export async function listActionsByPathwayId(pathwayId: string): Promise<PathwayAction[]> {
  const { rows } = await pool.query(
    `SELECT * FROM pathway_actions WHERE "pathwayId" = $1 ORDER BY "window" ASC, "order" ASC`,
    [pathwayId],
  );
  return rows.map(mapAction);
}

export async function getStepById(id: string): Promise<PathwayStep | null> {
  const { rows } = await pool.query(`SELECT * FROM pathway_steps WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapStep(rows[0]) : null;
}

export async function getActionById(id: string): Promise<PathwayAction | null> {
  const { rows } = await pool.query(`SELECT * FROM pathway_actions WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapAction(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface NewPathwayStep {
  order: number;
  title: string;
  description: string;
  gapType: GapType | null;
  relatedSkill: string | null;
  unlockedOpportunityCount: number;
  unlockedOpportunityIds: string[];
  projectRecommendation: ProjectRecommendation | null;
}

export interface NewPathwayAction {
  /// Index into the steps array passed alongside - resolved to a real
  /// stepId after the steps are inserted. Null for standalone actions.
  stepIndex: number | null;
  window: ActionWindow;
  order: number;
  title: string;
  description: string;
  priority: number;
  estimatedTime: string;
  difficulty: string;
  expectedImpact: string;
  relatedSkill: string | null;
  relatedTargetJobs: string[];
}

export interface NewPathway {
  dreamJobId: string | null;
  currentStateLabel: string;
  targetStateLabel: string;
  startingReadiness: number;
  steps: NewPathwayStep[];
  actions: NewPathwayAction[];
}

/**
 * Replaces the user's active pathway with a freshly generated one, in a
 * single transaction. Archives rather than deletes the previous pathway so
 * a user who regenerates doesn't silently lose the progress history of the
 * one they'd been working through.
 */
export async function replaceActivePathway(userId: string, input: NewPathway): Promise<CareerPathway> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE career_pathways SET status = 'ARCHIVED', "updatedAt" = now() WHERE "userId" = $1 AND status = 'ACTIVE'`,
      [userId],
    );

    const pathwayId = randomUUID();
    const { rows } = await client.query(
      `INSERT INTO career_pathways
         (id, "userId", "dreamJobId", "currentStateLabel", "targetStateLabel", "startingReadiness", status, "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', now())
       RETURNING *`,
      [
        pathwayId,
        userId,
        input.dreamJobId,
        input.currentStateLabel,
        input.targetStateLabel,
        input.startingReadiness,
      ],
    );

    const stepIds: string[] = [];
    for (const step of input.steps) {
      const stepId = randomUUID();
      stepIds.push(stepId);
      await client.query(
        `INSERT INTO pathway_steps
           (id, "pathwayId", "order", title, description, "gapType", "relatedSkill",
            "unlockedOpportunityCount", "unlockedOpportunityIds", "projectRecommendation", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, now())`,
        [
          stepId,
          pathwayId,
          step.order,
          step.title,
          step.description,
          step.gapType,
          step.relatedSkill,
          step.unlockedOpportunityCount,
          JSON.stringify(step.unlockedOpportunityIds),
          step.projectRecommendation ? JSON.stringify(step.projectRecommendation) : null,
        ],
      );
    }

    for (const action of input.actions) {
      await client.query(
        `INSERT INTO pathway_actions
           (id, "pathwayId", "stepId", "window", "order", title, description, priority,
            "estimatedTime", difficulty, "expectedImpact", "relatedSkill", "relatedTargetJobs", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, now())`,
        [
          randomUUID(),
          pathwayId,
          action.stepIndex != null ? (stepIds[action.stepIndex] ?? null) : null,
          action.window,
          action.order,
          action.title,
          action.description,
          action.priority,
          action.estimatedTime,
          action.difficulty,
          action.expectedImpact,
          action.relatedSkill,
          JSON.stringify(action.relatedTargetJobs),
        ],
      );
    }

    await client.query("COMMIT");
    return mapPathway(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Both status setters cast $2 explicitly.
 *
 * Without the casts Postgres sees the same parameter used as an enum (in
 * `status = $2`) and as text (in the CASE comparison) and refuses the
 * statement with "inconsistent types deduced for parameter $2" - which
 * surfaces as a 500 on every Complete/Skip click. The casts pin each usage
 * to the type that position actually needs.
 */
export async function setStepStatus(id: string, status: PathwayItemStatus): Promise<PathwayStep> {
  const { rows } = await pool.query(
    `UPDATE pathway_steps
       SET status = $2::"PathwayItemStatus",
           "completedAt" = CASE WHEN $2::text = 'COMPLETED' THEN now() ELSE NULL END,
           "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [id, status],
  );
  return mapStep(rows[0]);
}

export async function setActionStatus(id: string, status: PathwayItemStatus): Promise<PathwayAction> {
  const { rows } = await pool.query(
    `UPDATE pathway_actions
       SET status = $2::"PathwayItemStatus",
           "completedAt" = CASE WHEN $2::text = 'COMPLETED' THEN now() ELSE NULL END,
           "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [id, status],
  );
  return mapAction(rows[0]);
}

export async function updateStepContent(
  id: string,
  fields: { title?: string; description?: string; note?: string | null },
): Promise<PathwayStep> {
  const { rows } = await pool.query(
    `UPDATE pathway_steps
       SET title = COALESCE($2, title),
           description = COALESCE($3, description),
           note = CASE WHEN $4::boolean THEN $5 ELSE note END,
           "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [id, fields.title ?? null, fields.description ?? null, fields.note !== undefined, fields.note ?? null],
  );
  return mapStep(rows[0]);
}

export async function updateActionContent(
  id: string,
  fields: { title?: string; description?: string; note?: string | null },
): Promise<PathwayAction> {
  const { rows } = await pool.query(
    `UPDATE pathway_actions
       SET title = COALESCE($2, title),
           description = COALESCE($3, description),
           note = CASE WHEN $4::boolean THEN $5 ELSE note END,
           "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [id, fields.title ?? null, fields.description ?? null, fields.note !== undefined, fields.note ?? null],
  );
  return mapAction(rows[0]);
}

export async function deletePathway(id: string): Promise<void> {
  await pool.query(`DELETE FROM career_pathways WHERE id = $1`, [id]);
}
