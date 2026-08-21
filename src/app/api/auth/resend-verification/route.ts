import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { getUserById, setVerificationToken } from "@/lib/db/users";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function POST() {
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(`resend_verify_${ip}`, 3, 300)) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }

  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await getUserById(authUser.id);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ message: "Email already verified." });
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await setVerificationToken(user.id, token, expiresAt);
  await sendVerificationEmail(user.email, token);

  return NextResponse.json({ message: "Verification email sent." });
}
