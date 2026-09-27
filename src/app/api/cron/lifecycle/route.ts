import { NextResponse } from "next/server";

import { runLifecycleEmails } from "@/lib/lifecycle";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Daily follow-up emails: day 0/2/5 and unpaid checkouts. See lib/lifecycle-core.ts. */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runLifecycleEmails();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[workly:lifecycle] cron failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
