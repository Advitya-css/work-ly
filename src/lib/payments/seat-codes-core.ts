import { createHmac, randomBytes } from "node:crypto";

/**
 * SEAT CODES - pure parts, so they can be tested.
 *
 * One code (e.g. TEAM-7KQ2MX4P) that up to N people redeem. It lives in the
 * existing beta_codes table as N single-use rows - TEAM-7KQ2MX4P#001 to
 * #0NN - so no migration is needed and "seats used" is just a count. A
 * person types the group code; redemption takes the next free row.
 *
 * Codes for a paid order are derived from the order id (HMAC), so a webhook
 * retried five times, the thank-you page and the receipt email all arrive
 * at the same code without storing it anywhere.
 */

export const SEAT_SEP = "#";

/** No 0/O, 1/I/L: codes get read aloud and typed from emails. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export type SeatPrefix = "TEAM" | "COACH" | "GIFT" | "PASS";

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

/** A group code: PREFIX-XXXXXXXX (never contains the seat separator). */
export function isGroupCode(code: string): boolean {
  return /^(TEAM|COACH|GIFT|PASS)-[A-Z0-9]{6,12}$/.test(code);
}

export function seatRowCode(group: string, index: number): string {
  return `${group}${SEAT_SEP}${String(index).padStart(3, "0")}`;
}

/** All row codes for a group of `seats` seats. */
export function seatRowCodes(group: string, seats: number): string[] {
  const n = Math.max(1, Math.min(500, Math.floor(seats)));
  return Array.from({ length: n }, (_, i) => seatRowCode(group, i + 1));
}

/** The LIKE pattern matching a group's rows. Group codes hold no % or _. */
export function seatRowPattern(group: string): string {
  return `${group}${SEAT_SEP}%`;
}

function encode(bytes: Buffer, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** The code for a paid order - the same every time for the same order. */
export function groupCodeForOrder(orderId: string, prefix: SeatPrefix, secret: string): string {
  const digest = createHmac("sha256", secret).update(`seat:${orderId}`).digest();
  return `${prefix}-${encode(digest, 8)}`;
}

/** A fresh random code, for codes made by hand in admin. */
export function randomGroupCode(prefix: SeatPrefix): string {
  return `${prefix}-${encode(randomBytes(8), 8)}`;
}

/** Stored beside the rows: rate_limits key `seatcode:<GROUP>:<label>`, count = months of Pro per seat. */
export function seatMetaKey(group: string, label: string): string {
  return `seatcode:${group}:${cleanLabel(label)}`;
}

export function cleanLabel(label: string): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "manual"
  );
}

/** Reads `seatcode:<GROUP>:<label>` back into its parts. */
export function parseSeatMetaKey(key: string): { group: string; label: string } | null {
  const m = /^seatcode:([A-Z]+-[A-Z0-9]+):(.*)$/.exec(key);
  return m ? { group: m[1], label: m[2] } : null;
}

/** The secret codes are derived with; falls back through the app's other secrets. */
export function seatSecret(env: Record<string, string | undefined> = process.env): string {
  return env.SEAT_CODE_SECRET || env.EMAIL_LINK_SECRET || env.AUTH_SECRET || "workly-seat-codes";
}

/** "https://work-ly.in/redeem?code=TEAM-7KQ2MX4P" */
export function redeemUrl(appUrl: string, group: string): string {
  return `${appUrl.replace(/\/$/, "")}/redeem?code=${encodeURIComponent(group)}`;
}
