"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { setStudentMode, updateStudentProfile } from "@/lib/db/career-profile";
import { safeMessage } from "@/lib/errors";
import { COUNTRY_RULES } from "@/lib/student/legal-limits";

/**
 * Student mode is a switch on the profile rather than a separate account
 * type. Someone who graduates should keep every application, every score
 * and every document they built up as a student, so leaving student mode
 * changes what Workly shows and nothing else about their data.
 */

function revalidateStudentViews() {
  revalidatePath("/student");
  revalidatePath("/student/jobs");
  revalidatePath("/student/internships");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

/**
 * Both of these return a message rather than throwing.
 *
 * The first version let a database error propagate out of the action, and
 * Next rendered it as a crashed page showing the raw Postgres text
 * (`column "isStudent" ... does not exist`) to the user. Workly's rule is
 * that a driver error never reaches a screen, so these catch, hand the
 * error to safeMessage, and let the caller show a sentence.
 *
 * redirect() throws by design, so it is called only after the write has
 * already succeeded, outside the try.
 */
export interface ModeSwitchResult {
  error?: string;
}

export async function enterStudentModeAction(): Promise<ModeSwitchResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  try {
    await setStudentMode(user.id, true);
  } catch (error) {
    return { error: safeMessage(error, "student-mode") };
  }

  revalidateStudentViews();
  redirect("/student");
}

export async function exitStudentModeAction(): Promise<ModeSwitchResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  try {
    await setStudentMode(user.id, false);
  } catch (error) {
    return { error: safeMessage(error, "student-mode") };
  }

  revalidateStudentViews();
  redirect("/dashboard");
}

const studentProfileSchema = z.object({
  university: z.string().trim().max(200).optional().or(z.literal("")),
  major: z.string().trim().max(150).optional().or(z.literal("")),
  expectedGraduation: z.string().trim().max(40).optional().or(z.literal("")),
  studentCountry: z.string().trim().max(4).optional().or(z.literal("")),
});

export interface StudentActionState {
  error?: string;
  success?: boolean;
}

export async function saveStudentProfileAction(
  _prev: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = studentProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Please check the details and try again." };
  }

  const country = parsed.data.studentCountry || null;
  // A country Workly has no sourced rules for would produce a screen that
  // silently shows no limits, which reads as "there are none". Reject it.
  if (country && !COUNTRY_RULES.some((c) => c.code === country)) {
    return { error: "Workly does not have sourced work rules for that country yet." };
  }

  try {
    await updateStudentProfile(user.id, {
      university: parsed.data.university || null,
      major: parsed.data.major || null,
      expectedGraduation: parsed.data.expectedGraduation || null,
      studentCountry: country,
    });
  } catch (error) {
    return { error: safeMessage(error, "student-profile") };
  }

  revalidateStudentViews();
  return { success: true };
}

// Deliberately no exported isStudentMode(userId) helper here.
//
// An exported function in a "use server" file is a callable endpoint, so
// one taking a userId would let anyone ask about anyone's account. The
// isolation test caught exactly that. Layouts read the profile directly
// through the db layer instead, where the user comes from the session.
