import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import { toArray } from "./array";
import type { CareerProfile } from "./types";

function mapRow(row: Record<string, unknown>): CareerProfile {
  return {
    id: row.id as string,
    userId: row.userId as string,
    headline: (row.headline as string | null) ?? null,
    summary: (row.summary as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    currentRole: (row.currentRole as string | null) ?? null,
    currentCompany: (row.currentCompany as string | null) ?? null,
    yearsExperience: (row.yearsExperience as number | null) ?? null,
    skills: toArray<string>(row.skills),
    resumeFileName: (row.resumeFileName as string | null) ?? null,
    resumeFileUrl: (row.resumeFileUrl as string | null) ?? null,
    resumeUploadedAt: (row.resumeUploadedAt as Date | null) ?? null,
    parsedData: row.parsedData ?? null,
    isStudent: Boolean(row.isStudent),
    university: (row.university as string | null) ?? null,
    major: (row.major as string | null) ?? null,
    expectedGraduation: (row.expectedGraduation as string | null) ?? null,
    studentCountry: (row.studentCountry as string | null) ?? null,
    preferredLocations: toArray<string>(row.preferredLocations),
    openToRemote: row.openToRemote == null ? true : Boolean(row.openToRemote),
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function getCareerProfileByUserId(
  userId: string,
): Promise<CareerProfile | null> {
  const { rows } = await pool.query(
    `SELECT * FROM career_profiles WHERE "userId" = $1 LIMIT 1`,
    [userId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

/**
 * Every user gets at most one CareerProfile row. CV upload can happen
 * before the user has ever touched the "facts about you" form, so this
 * creates an empty profile row on first use rather than requiring one to
 * already exist - child rows (Education, Experience, ...) always need a
 * careerProfileId to attach to.
 */
export async function getOrCreateCareerProfile(userId: string): Promise<CareerProfile> {
  const existing = await getCareerProfileByUserId(userId);
  if (existing) return existing;

  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO career_profiles (id, "userId", "updatedAt")
     VALUES ($1, $2, now())
     ON CONFLICT ("userId") DO UPDATE SET "updatedAt" = career_profiles."updatedAt"
     RETURNING *`,
    [id, userId],
  );
  return mapRow(rows[0]);
}

export type CareerProfileInput = Partial<
  Pick<
    CareerProfile,
    | "headline"
    | "summary"
    | "location"
    | "currentRole"
    | "currentCompany"
    | "yearsExperience"
    | "skills"
  >
>;

/**
 * Creates the profile row on first save, otherwise replaces it in place.
 * Callers always send the full form state, so this is a plain overwrite
 * (an empty field is a deliberate clear, not "leave unchanged").
 */
export async function upsertCareerProfile(
  userId: string,
  input: CareerProfileInput,
): Promise<CareerProfile> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO career_profiles
       (id, "userId", headline, summary, location, "currentRole", "currentCompany", "yearsExperience", skills, "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     ON CONFLICT ("userId") DO UPDATE SET
       headline = EXCLUDED.headline,
       summary = EXCLUDED.summary,
       location = EXCLUDED.location,
       "currentRole" = EXCLUDED."currentRole",
       "currentCompany" = EXCLUDED."currentCompany",
       "yearsExperience" = EXCLUDED."yearsExperience",
       skills = EXCLUDED.skills,
       "updatedAt" = now()
     RETURNING *`,
    [
      id,
      userId,
      input.headline ?? null,
      input.summary ?? null,
      input.location ?? null,
      input.currentRole ?? null,
      input.currentCompany ?? null,
      input.yearsExperience ?? null,
      input.skills ?? null,
    ],
  );
  return mapRow(rows[0]);
}

/**
 * The student and location fields are updated through their own functions
 * rather than being folded into upsertCareerProfile above.
 *
 * That upsert is a deliberate whole-row overwrite: it assumes the caller
 * sent every field, so a blank input means "clear this". Settings and the
 * student screens each edit one slice of the profile, so routing them
 * through it would silently wipe whatever the other screen had saved.
 */

export interface StudentProfileInput {
  university?: string | null;
  major?: string | null;
  expectedGraduation?: string | null;
  studentCountry?: string | null;
}

export async function updateStudentProfile(
  userId: string,
  input: StudentProfileInput,
): Promise<CareerProfile> {
  await getOrCreateCareerProfile(userId);
  const { rows } = await pool.query(
    `UPDATE career_profiles SET
       university = $2,
       major = $3,
       "expectedGraduation" = $4,
       "studentCountry" = $5,
       "updatedAt" = now()
     WHERE "userId" = $1
     RETURNING *`,
    [
      userId,
      input.university ?? null,
      input.major ?? null,
      input.expectedGraduation ?? null,
      input.studentCountry ?? null,
    ],
  );
  return mapRow(rows[0]);
}

/** Entering or leaving student mode. Kept separate so it never clears the details. */
export async function setStudentMode(userId: string, isStudent: boolean): Promise<CareerProfile> {
  await getOrCreateCareerProfile(userId);
  const { rows } = await pool.query(
    `UPDATE career_profiles SET "isStudent" = $2, "updatedAt" = now()
     WHERE "userId" = $1
     RETURNING *`,
    [userId, isStudent],
  );
  return mapRow(rows[0]);
}

export interface LocationPreferencesInput {
  location?: string | null;
  preferredLocations?: string[];
  openToRemote?: boolean;
}

export async function updateLocationPreferences(
  userId: string,
  input: LocationPreferencesInput,
): Promise<CareerProfile> {
  await getOrCreateCareerProfile(userId);
  const { rows } = await pool.query(
    `UPDATE career_profiles SET
       location = $2,
       "preferredLocations" = $3,
       "openToRemote" = $4,
       "updatedAt" = now()
     WHERE "userId" = $1
     RETURNING *`,
    [userId, input.location ?? null, input.preferredLocations ?? [], input.openToRemote ?? true],
  );
  return mapRow(rows[0]);
}
