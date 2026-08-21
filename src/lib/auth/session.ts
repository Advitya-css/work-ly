import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, REMEMBER_ME_TTL_SECONDS } from "@/lib/auth/constants";

export { SESSION_COOKIE_NAME };

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Copy .env.example to .env and set a value (see README).",
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // user id
  email: string;
}

export async function createSessionToken(
  payload: SessionPayload,
  rememberMe?: boolean,
): Promise<string> {
  const ttl = rememberMe ? REMEMBER_ME_TTL_SECONDS : SESSION_TTL_SECONDS;
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

/** Sets the session cookie. Only callable from a Server Action or Route Handler. */
export async function setSessionCookie(token: string, rememberMe?: boolean) {
  const store = await cookies();
  const options: Record<string, unknown> = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
  if (rememberMe) {
    options.maxAge = REMEMBER_ME_TTL_SECONDS;
  }
  // When rememberMe is false/undefined, omit maxAge → session cookie that
  // expires when the browser closes.
  store.set(SESSION_COOKIE_NAME, token, options);
}

/** Clears the session cookie. Only callable from a Server Action or Route Handler. */
export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

/** Reads the raw session token from the request cookies (read-only, safe anywhere server-side). */
export async function readSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
}
