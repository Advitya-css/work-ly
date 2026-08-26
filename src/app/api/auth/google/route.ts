import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  if (!clientId) {
    return NextResponse.json({ error: "Missing GOOGLE_CLIENT_ID in environment" }, { status: 500 });
  }

  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10 // 10 minutes
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "online");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
