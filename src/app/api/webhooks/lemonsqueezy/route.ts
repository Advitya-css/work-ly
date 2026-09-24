import { NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db/pool";
import { planForVariant } from "@/lib/plans";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || "";
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";

    const hmac = crypto.createHmac("sha256", secret);
    const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta.event_name;
    const customData = payload.meta.custom_data;

    // We only care when a subscription is successfully created or renewed
    if (eventName === "subscription_created" || eventName === "order_created" || eventName === "subscription_updated") {
      const userId = customData?.user_id;
      const variantId = payload.data?.attributes?.variant_id?.toString();
      let intervalAmount = "1 month";
      if (variantId === process.env.LEMON_SQUEEZY_QUARTERLY_VARIANT_ID) intervalAmount = "3 months";
      if (variantId === process.env.LEMON_SQUEEZY_YEARLY_VARIANT_ID) intervalAmount = "1 year";
      
      if (!userId) {
        console.error("No user_id found in Lemon Squeezy custom data");
        return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
      }

      // Upgrade the user to Pro in our database
      await pool.query(
        `UPDATE users SET "isPro" = true, "proUntil" = now() + interval '${intervalAmount}', "updatedAt" = now() WHERE id = $1`,
        [userId]
      );
      
      // Remember which pass it was, for the yearly-only perks (lib/plans.ts).
      // Separate and best-effort: before the yearly-perks migration runs the
      // column doesn't exist, and that must never undo the upgrade above.
      await pool
        .query(`UPDATE users SET "proPlan" = $2 WHERE id = $1`, [userId, planForVariant(variantId)])
        .catch((error) => console.warn("[workly:webhook] could not record the plan:", error instanceof Error ? error.message : error));

      console.log(`Successfully upgraded user ${userId} to Pro! Interval: ${intervalAmount}`);
    }

    // Handle cancellations (optional but good practice)
    if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
      const userId = customData?.user_id;
      if (userId) {
        await pool.query(
          `UPDATE users SET "isPro" = false, "updatedAt" = now() WHERE id = $1`,
          [userId]
        );
        console.log(`User ${userId} subscription ended. Downgraded to free.`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
