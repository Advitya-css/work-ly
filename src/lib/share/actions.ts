"use server";

import { getCurrentUser } from "@/lib/auth";
import { displayJobTitle } from "@/lib/format";
import { getOpportunityWithJobById } from "@/lib/opportunities/get-with-job";
import { checkRateLimit } from "@/lib/rate-limit";
import { coverageOf, MIN_COVERAGE_FOR_SCORE } from "@/lib/scoring/coverage";
import { pickRows, SHARE_RECS, type ShareRec } from "@/lib/share/verdict-core";
import { signVerdict } from "@/lib/share/verdict-token";
import type { ScoreBreakdown } from "@/lib/db/types";

/**
 * A share link for one of your own job checks. Built from the saved
 * analysis on the server, never from anything the browser sends, so the
 * card can only say what Work-ly actually said.
 */
export async function shareVerdictAction(opportunityId: string): Promise<{ token?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in first." };
  if (!(await checkRateLimit(`share_verdict:${user.id}`, 30, 60 * 60))) {
    return { error: "That's a lot of shares this hour. Try again a little later." };
  }
  const opp = await getOpportunityWithJobById(user.id, String(opportunityId ?? ""));
  if (!opp || opp.userId !== user.id || !opp.analysis) return { error: "Couldn't find that job." };
  const a = opp.analysis;
  if (!SHARE_RECS.includes(a.recommendation as ShareRec)) return { error: "This job doesn't have a verdict to share yet." };
  const reliable = coverageOf(a.scoreBreakdown as ScoreBreakdown) >= MIN_COVERAGE_FOR_SCORE;
  const rows = pickRows(
    [...a.mandatoryRequirements, ...a.preferredRequirements].map((r) => ({ x: r.text, k: r.status === "met" ? "met" : r.status === "not-met" ? "missing" : "unknown" }) as const),
  );
  const token = signVerdict({
    r: a.recommendation as ShareRec,
    s: reliable ? a.fitScore : null,
    t: opp.job.title ? displayJobTitle(opp.job.title) : null,
    c: opp.job.company ?? null,
    q: rows,
    i: user.id,
  });
  return token ? { token } : { error: "Sharing isn't available right now." };
}
