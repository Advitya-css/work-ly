import type { Metadata } from "next";
import Link from "next/link";
import { findUserByVerificationToken, setEmailVerified } from "@/lib/db/users";

export const metadata: Metadata = { title: "Verify Email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-lg font-semibold text-foreground">Invalid link</h1>
        <p className="text-sm text-muted-foreground">
          This verification link is missing or malformed.
        </p>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  const user = await findUserByVerificationToken(token);

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-lg font-semibold text-foreground">Link expired</h1>
        <p className="text-sm text-muted-foreground">
          This verification link has expired or has already been used. Log in and request a new one.
        </p>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  await setEmailVerified(user.id);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      <h1 className="text-lg font-semibold text-foreground">Email verified!</h1>
      <p className="text-sm text-muted-foreground">
        Your email has been verified. You&apos;re all set.
      </p>
      <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
        Go to dashboard
      </Link>
    </div>
  );
}
