import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { fromBase64Url, normalizeShared, toBase64Url, type SharedVerdict } from "@/lib/share/verdict-core";

/**
 * Signs a verdict card into a link-safe token, and checks one. Only the
 * server signs, and only verdicts it computed itself, so a card that
 * verifies is one Work-ly really gave.
 */

function secret(): string | null {
  const s = process.env.AUTH_SECRET?.trim() || process.env.EMAIL_LINK_SECRET?.trim();
  if (s) return `share-verdict:${s}`;
  // Local development only: production without a secret simply can't share.
  return process.env.NODE_ENV === "production" ? null : "share-verdict:local-development";
}

function sign(body: string, key: string): string {
  return createHmac("sha256", key).update(body).digest("base64url").slice(0, 22);
}

export function signVerdict(v: SharedVerdict): string | null {
  const key = secret();
  const clean = normalizeShared(v);
  if (!key || !clean) return null;
  const body = toBase64Url(JSON.stringify(clean));
  return `${body}.${sign(body, key)}`;
}

export function verifyVerdict(token: string | null | undefined): SharedVerdict | null {
  const key = secret();
  if (!key || !token || token.length > 1800) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(body, key));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const json = fromBase64Url(body);
  if (!json) return null;
  try {
    return normalizeShared(JSON.parse(json));
  } catch {
    return null;
  }
}
