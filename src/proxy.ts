import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const PROTECTED_PATHS = [
  "/discover",
  "/analyze-job",
  "/student",
  "/dashboard",
  "/opportunities",
  "/career-profile",
  "/career-goals",
  "/dream-job",
  "/career-path",
  "/applications",
  "/settings",
  "/onboarding",
];

const AUTH_ONLY_PATHS = ["/login", "/signup"];

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isAuthOnly = AUTH_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!isProtected && !isAuthOnly) {
    return NextResponse.next();
  }

  const authenticated = await hasValidSession(request);

  if (isProtected && !authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthOnly && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/discover/:path*",
    "/analyze-job/:path*",
    "/student/:path*",
    "/dashboard/:path*",
    "/opportunities/:path*",
    "/career-profile/:path*",
    "/career-goals/:path*",
    "/dream-job/:path*",
    "/career-path/:path*",
    "/applications/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/login",
    "/signup",
  ],
};
