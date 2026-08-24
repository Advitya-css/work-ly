import "server-only";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { setVerificationCode } from "@/lib/db/users";
import { sendVerificationCodeEmail } from "@/lib/email";

/** Short enough that a stolen code is useless within a session; long enough not to be annoying. */
export const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;

/**
 * A 6-digit code is only 1,000,000 possibilities - expiry alone doesn't stop
 * someone hammering the check endpoint for those 10 minutes. Capping wrong
 * guesses at 5 (checked by the caller against verificationAttempts) means an
 * attacker gets 5 tries per issued code, not 10 minutes of unlimited ones;
 * requesting a new code resets the counter, so a real user who fat-fingers
 * it isn't locked out, just needs a fresh code.
 */
export const MAX_VERIFICATION_ATTEMPTS = 5;

/**
 * Generates a fresh 6-digit verification code, stores its bcrypt hash
 * (never the code itself - same reasoning as password storage), and emails
 * it. The email send is fire-and-forget: a Resend outage shouldn't fail
 * signup or a resend request outright, since the code is still valid and a
 * transient send failure is retryable via "resend code".
 */
export async function issueVerificationCode(userId: string, email: string): Promise<void> {
  const code = randomInt(100000, 1000000).toString();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);
  await setVerificationCode(userId, codeHash, expiresAt);
  sendVerificationCodeEmail(email, code).catch((err) => {
    console.error("[workly:email] Failed to send verification code:", err);
  });
}
