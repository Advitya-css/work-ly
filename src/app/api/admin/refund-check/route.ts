import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { BUSINESS } from "@/lib/business";
import { pool } from "@/lib/db/pool";
import { getRefundStatus } from "@/lib/payments/refund-window";

export const dynamic = "force-dynamic";

/**
 * For the owner, before approving a refund in Polar:
 *   /api/admin/refund-check?key=<ADMIN_SECRET>&email=<buyer's email>
 * Says whether the buyer is inside the light-use money-back guarantee.
 * Same two locks as /api/admin/export: the secret AND the owner's login.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (!process.env.ADMIN_SECRET || searchParams.get("key") !== process.env.ADMIN_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const me = await getCurrentUser();
  if (!me || me.email !== BUSINESS.supportEmail) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const email = searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Add ?email=the buyer's email" }, { status: 400 });

  const { rows } = await pool.query(
    `SELECT id, email, "proPlan", "proUntil" FROM users WHERE lower(email) = $1 LIMIT 1`,
    [email],
  );
  const user = rows[0];
  if (!user) return NextResponse.json({ found: false, email });

  const status = await getRefundStatus(user.id as string);
  const verdict = !status
    ? "No first-purchase guarantee on record (purchased before the light-use rule, or never purchased). Decide manually."
    : status.eligible
      ? `ELIGIBLE: ${status.used} of ${status.limit} Pro AI tools used, window open until ${status.until?.toISOString()}. Refund in full.`
      : status.until && status.until.getTime() <= Date.now()
        ? `NOT ELIGIBLE: the ${BUSINESS.refundDays}-day window closed on ${status.until.toISOString()}.`
        : `NOT ELIGIBLE: ${status.used} Pro AI tools used (limit ${status.limit}).`;

  return NextResponse.json({ found: true, email: user.email, plan: user.proPlan, proUntil: user.proUntil, status, verdict });
}
