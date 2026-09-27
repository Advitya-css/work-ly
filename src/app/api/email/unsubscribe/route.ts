import { NextResponse } from "next/server";

import { optOut, validUnsubscribeToken } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

function page(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:80px auto;padding:0 20px;color:#1c1a19"><h1 style="font-size:22px">${title}</h1><p style="color:#6b6560;line-height:1.5">${body}</p><p><a href="/" style="color:#7a2e55">Back to Work-ly</a></p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function handle(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  if (!validUnsubscribeToken(userId, token)) {
    return page("That link didn't work", "Reply to any of our emails and we'll take you off the list by hand.", 400);
  }
  await optOut(userId);
  return page("You're unsubscribed", "You won't get any more follow-up emails from Work-ly. Job alerts you switched on yourself are separate and can be turned off in Settings.");
}

/** The link in the email. */
export const GET = handle;
/** One-click unsubscribe from mail apps (List-Unsubscribe-Post). */
export const POST = handle;
