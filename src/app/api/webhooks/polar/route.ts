import { NextResponse } from "next/server";
import { Webhooks } from "@polar-sh/sdk/webhooks";
import { pool } from "@/lib/db/pool";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("webhook-signature") || "";
    const secret = process.env.POLAR_WEBHOOK_SECRET || "";

    if (!secret) {
      console.error("Missing POLAR_WEBHOOK_SECRET");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    // Verify the webhook signature using Polar's SDK
    let event;
    try {
      const webhookPayload = JSON.parse(rawBody);
      const webhookHeaders = {
        "webhook-id": req.headers.get("webhook-id") || "",
        "webhook-timestamp": req.headers.get("webhook-timestamp") || "",
        "webhook-signature": signature,
      };
      event = Webhooks.verify(rawBody, webhookHeaders, secret);
    } catch (err) {
      console.error("Invalid Polar webhook signature:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Handle Order Created (for 3-Month and Yearly Passes)
    if (event.type === "order.created") {
      const order = event.data;
      const userId = order.custom_field_data?.user_id || order.customer_metadata?.user_id;
      
      if (!userId) {
        console.error("No user_id found in Polar order metadata");
        return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
      }

      // Determine pass length based on price (hacky fallback if product ID mapping isn't perfect)
      const amount = order.amount;
      let intervalAmount = "1 month";
      let planType = "monthly";
      
      if (amount >= 10000) { // $100+ -> Yearly
        intervalAmount = "1 year";
        planType = "yearly";
      } else if (amount >= 4000) { // $40+ -> 3-Month
        intervalAmount = "3 months";
        planType = "quarterly";
      }

      await pool.query(
        `UPDATE users SET "isPro" = true, "proUntil" = now() + interval '${intervalAmount}', "proPlan" = $2, "updatedAt" = now() WHERE id = $1`,
        [userId, planType]
      );
      console.log(`Upgraded user ${userId} to ${planType} via Polar order`);
    }

    // Handle Subscription Created/Updated (for Monthly)
    if (event.type === "subscription.created" || event.type === "subscription.updated") {
      const subscription = event.data;
      if (subscription.status === "active") {
        const userId = subscription.custom_field_data?.user_id || subscription.customer_metadata?.user_id || subscription.metadata?.user_id;
        
        if (userId) {
          await pool.query(
            `UPDATE users SET "isPro" = true, "proUntil" = now() + interval '1 month', "proPlan" = 'monthly', "updatedAt" = now() WHERE id = $1`,
            [userId]
          );
          console.log(`Upgraded user ${userId} to monthly via Polar subscription`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
