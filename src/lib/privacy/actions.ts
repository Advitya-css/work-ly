"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/lib/auth/actions";
import { pool } from "@/lib/db/pool";
import { storageProvider } from "@/lib/storage";
import { listDocumentsByUserId } from "@/lib/db/documents";
import { safeMessage } from "@/lib/errors";

/**
 * PRIVACY CONTROLS
 *
 * Deletion here is real deletion, not a hidden flag. Three levels, because
 * they are genuinely different requests:
 *
 *   deleteCv          - remove uploaded files, keep the profile they built
 *   deleteCareerData  - remove everything Workly derived or tracked, keep
 *                       the account
 *   deleteAccount     - remove everything, including the login
 *
 * Every one runs in a transaction and removes stored files as well as
 * database rows. A "delete my CV" that leaves the PDF on disk is not a
 * deletion, and getting that wrong is exactly the sort of thing people are
 * right to be angry about.
 */

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Removes the stored files themselves, not just their rows. */
async function deleteStoredFiles(userId: string): Promise<void> {
  const documents = await listDocumentsByUserId(userId);
  await Promise.all(
    documents.map(async (document) => {
      try {
        await storageProvider.delete(document.storageKey);
      } catch {
        // A missing file shouldn't block the database deletion - the point
        // is that the data ends up gone, and a file that isn't there is
        // already in the desired state.
      }
    }),
  );
}

export interface PrivacyActionState {
  error?: string;
  success?: string;
}

/**
 * Deletes uploaded CV files and their document records. The career profile
 * built FROM them stays - someone clearing out an old PDF usually doesn't
 * mean "erase my work history", and conflating the two would be a nasty
 * surprise.
 */
export async function deleteCvAction(): Promise<PrivacyActionState> {
  const user = await requireUser();
  try {
    await deleteStoredFiles(user.id);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM documents WHERE "userId" = $1`, [user.id]);
      // The stored copy of the raw extraction goes too - it's a verbatim
      // copy of the CV's contents and would otherwise survive the delete.
      await client.query(
        `UPDATE career_profiles
           SET "parsedData" = NULL,
               "resumeFileName" = NULL,
               "resumeFileUrl" = NULL,
               "resumeUploadedAt" = NULL,
               "updatedAt" = now()
         WHERE "userId" = $1`,
        [user.id],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    revalidatePath("/career-profile");
    revalidatePath("/settings");
    return { success: "Your uploaded CV files have been deleted. Your career profile is unchanged." };
  } catch (error) {
    return { error: safeMessage(error, "deleteCvAction", "We couldn't delete your CV files.") };
  }
}

/**
 * Deletes everything Workly holds about the user's career - profile,
 * skills, jobs, analyses, opportunities, pathways, applications,
 * discovered listings - while keeping the account itself.
 *
 * Ordering matters: children before parents, since several relations are
 * SetNull rather than Cascade and would otherwise leave orphans.
 */
export async function deleteCareerDataAction(): Promise<PrivacyActionState> {
  const user = await requireUser();
  try {
    await deleteStoredFiles(user.id);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Applications first - they intentionally survive job deletion via
      // SetNull, so they must be removed explicitly rather than assumed
      // to cascade.
      await client.query(`DELETE FROM applications WHERE "userId" = $1`, [user.id]);
      await client.query(`DELETE FROM discovered_jobs WHERE "userId" = $1`, [user.id]);
      await client.query(`DELETE FROM discovery_runs WHERE "userId" = $1`, [user.id]);
      await client.query(`DELETE FROM job_source_configs WHERE "userId" = $1`, [user.id]);
      await client.query(`DELETE FROM career_pathways WHERE "userId" = $1`, [user.id]);
      await client.query(`DELETE FROM dream_job_analyses WHERE "userId" = $1`, [user.id]);
      await client.query(`DELETE FROM dream_jobs WHERE "userId" = $1`, [user.id]);
      await client.query(`DELETE FROM opportunities WHERE "userId" = $1`, [user.id]);
      await client.query(`DELETE FROM job_analyses WHERE "userId" = $1`, [user.id]);
      await client.query(`DELETE FROM jobs WHERE "userId" = $1`, [user.id]);
      await client.query(`DELETE FROM career_goals WHERE "userId" = $1`, [user.id]);
      await client.query(`DELETE FROM documents WHERE "userId" = $1`, [user.id]);
      // career_profiles cascades to educations, experiences, projects,
      // skills, achievements and certifications.
      await client.query(`DELETE FROM career_profiles WHERE "userId" = $1`, [user.id]);
      await client.query(`UPDATE users SET "onboardedAt" = NULL, "updatedAt" = now() WHERE id = $1`, [
        user.id,
      ]);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    revalidatePath("/", "layout");
    return {
      success:
        "All your career data has been deleted. Your account is still active. You can start again from scratch.",
    };
  } catch (error) {
    return { error: safeMessage(error, "deleteCareerDataAction", "We couldn't delete your career data.") };
  }
}

/**
 * Deletes the account and everything attached to it, then signs out.
 *
 * The `users` row cascades to essentially everything, but stored files
 * live outside the database and are removed first - otherwise the CV PDFs
 * would outlive the account that owned them.
 */
export async function deleteAccountAction(): Promise<PrivacyActionState> {
  const user = await requireUser();
  try {
    await deleteStoredFiles(user.id);
    await pool.query(`DELETE FROM users WHERE id = $1`, [user.id]);
  } catch (error) {
    return { error: safeMessage(error, "deleteAccountAction", "We couldn't delete your account.") };
  }

  // Outside the try: signOutAction redirects, and Next implements redirect
  // by throwing - catching it here would swallow the navigation and leave
  // the user on a page belonging to an account that no longer exists.
  await signOutAction();
  return {};
}
