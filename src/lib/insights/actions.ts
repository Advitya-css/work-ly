"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/pool";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasYearlyPerks } from "@/lib/plans";
import { recheckReadiness } from "@/lib/insights/progress";

const ALLOWED_MIN_FIT = new Set([75, 80, 85, 90]);

/** Turns the always-on job watch on or off (yearly perk). */
export async function updateJobWatchAction(input: { enabled: boolean; minFit: number }): Promise<{ ok?: true; error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasYearlyPerks(user)) return { error: "Always-on job watch comes with the Yearly Pass." };

  const minFit = ALLOWED_MIN_FIT.has(input.minFit) ? input.minFit : 85;
  try {
    await pool.query(`UPDATE users SET "watchEnabled" = $2, "watchMinFit" = $3, "updatedAt" = now() WHERE id = $1`, [
      user.id,
      input.enabled,
      minFit,
    ]);
  } catch (error) {
    console.error("[workly:watch] could not save settings", error);
    return { error: "Couldn't save that just now. Please try again in a minute." };
  }
  revalidatePath("/insights");
  revalidatePath("/settings");
  return { ok: true };
}

/** Re-checks dream-job readiness now instead of waiting for the monthly run (yearly perk, twice a day at most). */
export async function recheckReadinessNowAction(dreamJobId: string): Promise<{ score?: number; error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasYearlyPerks(user)) return { error: "Progress re-checks come with the Yearly Pass." };
  if (!(await checkRateLimit(`readiness_recheck_${user.id}`, 2, 24 * 60 * 60))) {
    return { error: "You've re-checked twice today. It re-checks by itself every month too." };
  }
  try {
    const score = await recheckReadiness(user.id, dreamJobId);
    if (score == null) return { error: "That dream job isn't ready to re-check yet." };
    revalidatePath("/insights");
    revalidatePath(`/dream-job/${dreamJobId}`);
    return { score };
  } catch (error) {
    console.error("[workly:progress] re-check failed", error);
    return { error: "Couldn't re-check just now. Please try again later." };
  }
}
