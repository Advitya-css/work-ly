import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

/**
 * Security headers, applied to every response (see `config.matcher` below -
 * it now covers the whole app, not just the auth-gated paths, so there's no
 * page a header here fails to reach).
 *
 * CSP is nonce-based for scripts rather than `'unsafe-inline'`: a fresh
 * nonce is minted per request, put on the CSP header, and handed to the app
 * via the `x-nonce` request header so the root layout can read it with
 * `headers()`. Next.js detects the nonce on the request and applies it to
 * every script it generates itself, so this closes off arbitrary inline
 * script injection without the app needing to do anything else.
 *
 * `style-src` keeps `'unsafe-inline'`: a nonce only covers `<style>`
 * elements, not the `style="..."` attribute React's `style={{...}}` prop
 * compiles to, and several pages in this app use that for things like a
 * progress bar's width. Tightening that would mean rewriting every one of
 * them to CSS custom properties first - worth doing eventually, not part of
 * this pass.
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  return response;
}

const PROTECTED_PATHS = [
  "/analyze-job",
  "/dashboard",
  "/opportunities",
  "/career-profile",
  "/career-goals",
  "/dream-job",
  "/career-path",
  "/applications",
  "/settings",
  "/onboarding",
  // Both pages already check auth + resource ownership themselves - this is
  // defense in depth, not the only thing standing between them and an
  // unauthenticated request, but it means a future page added under either
  // tree is covered by the shared middleware net by default instead of
  // depending on remembering to add its own check.
  "/discover",
  "/student",
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

  // Minted once per request, threaded through to both the app (via the
  // request header, for the root layout to read) and the response (via the
  // CSP header, for the browser to enforce).
  // btoa/crypto.randomUUID rather than Buffer: middleware runs in the Edge
  // runtime by default, which has the Web Crypto/encoding globals but not
  // Node's Buffer.
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const withSecurityHeaders = (response: NextResponse): NextResponse => {
    response.headers.set("Content-Security-Policy", csp);
    return applySecurityHeaders(response);
  };
  const next = () => withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }));
  const redirect = (url: URL) => withSecurityHeaders(NextResponse.redirect(url));

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isAuthOnly = AUTH_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!isProtected && !isAuthOnly) {
    return next();
  }

  const authenticated = await hasValidSession(request);

  if (isProtected && !authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return redirect(loginUrl);
  }

  if (isAuthOnly && authenticated) {
    return redirect(new URL("/dashboard", request.url));
  }

  return next();
}

export const config = {
  matcher: [
    // Every route except Next's own static/image internals and files with
    // an extension (fonts, icons, etc.) - security headers apply app-wide,
    // not just to the auth-gated subset the redirect logic above cares
    // about.
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
