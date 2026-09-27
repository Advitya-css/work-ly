"use server";

import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/pool";
import { revalidatePath } from "next/cache";

export async function redeemBetaCodeAction(code: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  if (user.isPro && user.proPlan !== "trial") return { success: true };

  try {
    const cleanCode = code.trim().toUpperCase();
    
    // UNIVERSAL CODES - one word that works for anyone, off unless you
    // switch it on. They used to be hard-coded ("CODE", "REDDITPRO"...),
    // guessable, and capped by counting ALL Pro users - paying customers
    // included - so every free month given away came straight out of
    // sales. Now: only the words listed in BETA_UNIVERSAL_CODES work, only
    // until BETA_UNIVERSAL_UNTIL (a date), and at most
    // BETA_UNIVERSAL_MAX redemptions in total, counted on their own.
    const universal = universalCodes();
    if (universal.words.includes(cleanCode)) {
      if (!universal.open) {
        return { error: "This code has ended." };
      }
      const { rows: used } = await pool.query(
        `INSERT INTO rate_limits (key, count, expires_at) VALUES ('beta_universal_redemptions', 1, '2100-01-01T00:00:00Z')
         ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1
         RETURNING count`,
      );
      if (Number(used[0]?.count ?? 0) > universal.max) {
        return { error: "This code has reached its limit." };
      }

      const result = await pool.query(
        `UPDATE users SET "isPro" = true, "proUntil" = now() + interval '1 month' WHERE id = $1`,
        [user.id]
      );
      
      if (result.rowCount === 0) {
        return { error: "Failed to apply Pro status because the user record is missing in the database. Please reload and try again." };
      }
      await markBetaPlan(user.id);

      revalidatePath("/", "layout");
      return { success: true };
    }
    

    // Limited EARLYBIRD code (10 redemptions via underlying DB codes)
    let searchCode = cleanCode;
    if (cleanCode === "EARLYBIRD") {
      const { rows: availableRows } = await pool.query(
        `SELECT code FROM beta_codes WHERE code LIKE 'EARLYBIRD-%' AND "isUsed" = false ORDER BY code LIMIT 1`
      );
      if (availableRows.length === 0) {
        return { error: "This beta code has reached its 10 person limit. Sorry!" };
      }
      searchCode = availableRows[0].code;
    }

    // Fallback to single-use database codes
    const { rows } = await pool.query(
      `SELECT * FROM beta_codes WHERE code = $1 AND "isUsed" = false`,
      [searchCode]
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
        `UPDATE users SET "isPro" = true, "proUntil" = now() + interval '1 month' WHERE id = $1`,
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
    await markBetaPlan(user.id);

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("[workly:beta] Failed to redeem beta code:", error);
    return { error: "Failed to redeem code. Please try again." };
  }
}

/**
 * Beta testers get the yearly perks too (lib/plans.ts), so they can try
 * them. Best-effort: before the yearly-perks migration the column doesn't
 * exist, and that must not fail the redemption.
 */
async function markBetaPlan(userId: string): Promise<void> {
  await pool
    .query(`UPDATE users SET "proPlan" = 'beta' WHERE id = $1 AND ("proPlan" IS NULL OR "proPlan" <> 'yearly')`, [userId])
    .catch(() => undefined);
}

/**
 * The universal codes switched on in the environment, e.g.
 *   BETA_UNIVERSAL_CODES=REDDITPRO   BETA_UNIVERSAL_UNTIL=2026-10-31   BETA_UNIVERSAL_MAX=50
 * No list = none. No date = closed (a code with no end date is how free
 * months leaked before).
 */
function universalCodes(now = new Date()): { words: string[]; open: boolean; max: number } {
  const words = (process.env.BETA_UNIVERSAL_CODES ?? "")
    .split(",")
    .map((w) => w.trim().toUpperCase())
    .filter(Boolean);
  const until = Date.parse(process.env.BETA_UNIVERSAL_UNTIL ?? "");
  const max = Number(process.env.BETA_UNIVERSAL_MAX ?? 50);
  return {
    words,
    open: Number.isFinite(until) && now.getTime() <= until + 86_400_000,
    max: Number.isFinite(max) && max > 0 ? max : 50,
  };
}
