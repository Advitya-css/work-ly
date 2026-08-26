"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/pool";

export type PartTimeActionState = {
  error?: string;
  success?: string;
};

export async function savePartTimePreferencesAction(
  prevState: PartTimeActionState,
  formData: FormData,
): Promise<PartTimeActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not logged in" };

  const isPartTimeMode = formData.get("isPartTimeMode") === "on";
  const availability = formData.get("availability")?.toString().trim() || null;

  try {
    await pool.query(
      `INSERT INTO "career_profiles" ("id", "userId", "isPartTimeMode", "availability", "updatedAt") VALUES (gen_random_uuid(), $3, $1, $2, now()) ON CONFLICT ("userId") DO UPDATE SET "isPartTimeMode" = $1, "availability" = $2, "updatedAt" = now()`,
      [isPartTimeMode, availability, user.id]
    );

    revalidatePath("/settings");
    revalidatePath("/career-profile");
    revalidatePath("/opportunities");
    revalidatePath("/discover");

    return { success: "Saved" };
  } catch (error) {
    console.error("Failed to update part time preferences:", error);
    return { error: "Failed to save preferences. Have you run the database migration?" };
  }
}
