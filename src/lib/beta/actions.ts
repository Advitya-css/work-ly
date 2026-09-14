"use server";

import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/pool";
import { revalidatePath } from "next/cache";

export async function redeemBetaCodeAction(code: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  if (user.isPro) return { success: true };

  try {
    const cleanCode = code.trim().toUpperCase();
    
    // UNIVERSAL REDDIT CODES (Bypass the database beta_codes table)
    if (cleanCode === "CODE" || cleanCode === "UN-GHOST" || cleanCode === "REDDITPRO") {
      // PREVENT ABUSE: Cap total redemptions
      const { rows: countRows } = await pool.query(
        `SELECT count(*) as total FROM users WHERE "isPro" = true`
      );
      const proCount = parseInt(countRows[0].total, 10);
      
      if (proCount >= 600) { // 500 new + a buffer for existing/testing
        return { error: "This beta code has reached its maximum limit of 500 redemptions. Please join the waitlist!" };
      }

      const result = await pool.query(
        `UPDATE users SET "isPro" = true, "proUntil" = now() + interval '1 year' WHERE id = $1`,
        [user.id]
      );
      
      if (result.rowCount === 0) {
        return { error: "Failed to apply Pro status because the user record is missing in the database. Please reload and try again." };
      }

      revalidatePath("/", "layout");
      return { success: true };
    }
    
    // Fallback to single-use database codes
    const { rows } = await pool.query(
      `SELECT * FROM beta_codes WHERE code = $1 AND "isUsed" = false`,
      [cleanCode]
    );

    if (rows.length === 0) {
      return { error: "Invalid or already used beta code." };
    }

    const betaCodeId = rows[0].id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(
        `UPDATE beta_codes SET "isUsed" = true, "usedByUserId" = $1, "usedAt" = now() WHERE id = $2`,
        [user.id, betaCodeId]
      );

      // Single-use codes get 1 year too now!
      const result = await client.query(
        `UPDATE users SET "isPro" = true, "proUntil" = now() + interval '1 year' WHERE id = $1`,
        [user.id]
      );
      
      if (result.rowCount === 0) {
        throw new Error("Failed to apply Pro status");
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
