import { NextResponse } from "next/server";
import { authProvider } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/auth/sign-in?error=No_code_provided`);
  }

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) throw new Error("Failed to exchange token");
    const { access_token } = await tokenRes.json();

    // 2. Fetch user profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    
    if (!profileRes.ok) throw new Error("Failed to fetch profile");
    const profile = await profileRes.json();

    if (!profile.email) throw new Error("No email returned from Google");

    // 3. Delegate to authProvider
    if (authProvider.signInWithOAuth) {
      const result = await authProvider.signInWithOAuth({
        provider: "google",
        providerId: profile.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
      });

      if (result.error) {
        return NextResponse.redirect(`${baseUrl}/auth/sign-in?error=${encodeURIComponent(result.error)}`);
      }
    } else {
      throw new Error("signInWithOAuth is not implemented on the current auth provider");
    }

    // Success!
    return NextResponse.redirect(`${baseUrl}/dashboard`);
  } catch (error) {
    console.error("Google OAuth Error:", error);
    return NextResponse.redirect(`${baseUrl}/auth/sign-in?error=OAuth_failed`);
  }
}
