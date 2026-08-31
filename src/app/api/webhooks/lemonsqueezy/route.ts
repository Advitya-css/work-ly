import { NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db/pool";

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
    if (eventName === "subscription_created" || eventName === "order_created") {
      const userId = customData?.user_id;
      
      if (!userId) {
        console.error("No user_id found in Lemon Squeezy custom data");
        return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
      }

      // Upgrade the user to Pro in our database
      await pool.query(
        `UPDATE users SET "isPro" = true, "updatedAt" = now() WHERE id = $1`,
        [userId]
      );
      
      console.log(`Successfully upgraded user ${userId} to Pro!`);
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
