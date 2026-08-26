"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/pool";

export async function updateFreelanceModeAction(isFreelanceMode: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "Not logged in" };

    await pool.query(
      `
      UPDATE "career_profiles"
      SET "isFreelanceMode" = $1, "updatedAt" = NOW()
      WHERE "userId" = $2
      `,
      [isFreelanceMode, user.id]
    );

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/applications");
    revalidatePath("/discover");
    revalidatePath("/career-profile");
    return { success: true };
  } catch (err) {
    console.error("updateFreelanceModeAction error:", err);
    return { error: "Failed to update freelance preferences." };
  }
}
