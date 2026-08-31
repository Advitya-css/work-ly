"use server";

import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/pool";
import { revalidatePath } from "next/cache";

export async function redeemBetaCodeAction(code: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  if (user.isPro) return { error: "You are already a Pro user." };

  try {
    const cleanCode = code.trim().toUpperCase();
    
    // Check if code exists and is unused
    const { rows } = await pool.query(
      `SELECT * FROM beta_codes WHERE code = $1 AND "isUsed" = false`,
      [cleanCode]
    );

    if (rows.length === 0) {
      return { error: "Invalid or already used beta code." };
    }

    const betaCodeId = rows[0].id;

    // Begin transaction to mark code as used and upgrade user
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update code
      await client.query(
        `UPDATE beta_codes SET "isUsed" = true, "usedByUserId" = $1, "usedAt" = now() WHERE id = $2`,
        [user.id, betaCodeId]
      );

      // Upgrade user
      const result = await client.query(
        `UPDATE users SET "isPro" = true WHERE id = $1`,
        [user.id]
      );
      
      if (result.rowCount === 0) {
        throw new Error("Failed to apply Pro status because the user record is missing in the database. Please reload and try again.");
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    revalidatePath("/", "layout");
    
    

    return { success: true };
  } catch (error) {
    console.error("[workly:beta] Failed to redeem beta code:", error);
    return { error: "Failed to redeem code. Please try again." };
  }
}
