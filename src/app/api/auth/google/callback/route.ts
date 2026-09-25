import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authProvider } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=google`);
  }

  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${baseUrl}/login?error=google`);
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
        return NextResponse.redirect(`${baseUrl}/login?error=google`);
      }
      // New Google accounts go through onboarding (resume upload, first
      // matches) like email signups; returning users go to the dashboard.
      if (result.user && !result.user.onboardedAt) {
        const ref = cookieStore.get("workly_ref")?.value;
        if (ref) {
          const { recordReferral } = await import("@/lib/db/users");
          await recordReferral(result.user.id, ref).catch((e) => console.error("Failed to record Google referral", e));
          cookieStore.delete("workly_ref");
        }
        return NextResponse.redirect(`${baseUrl}/onboarding`);
      }
    } else {
      throw new Error("signInWithOAuth is not implemented on the current auth provider");
    }

    // Success!
    return NextResponse.redirect(`${baseUrl}/dashboard`);
  } catch (error) {
    console.error("Google OAuth Error:", error);
    return NextResponse.redirect(`${baseUrl}/login?error=google`);
  }
}
