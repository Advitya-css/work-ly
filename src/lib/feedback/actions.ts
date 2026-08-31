"use server";

import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/pool";
import { randomUUID } from "crypto";

export async function submitFeedbackAction(input: { type: string; message: string; url: string | null }) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  try {
    // If the database is completely offline or the table isn't created yet, 
    // we don't want to crash. The user needs to run prisma db push later.
    await pool.query(
      `INSERT INTO "feedbacks" (id, "userId", type, message, url, "createdAt") VALUES ($1, $2, $3, $4, $5, now())`,
      [randomUUID(), user.id, input.type, input.message, input.url]
    );
    return { success: true };
  } catch (error) {
    console.error("[workly:feedback] Failed to save feedback:", error);
    return { error: "Failed to save feedback" };
  }
}
