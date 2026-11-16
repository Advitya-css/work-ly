import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { KeyRound } from "lucide-react";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { REDEEM_COOKIE, cleanRedeemCode } from "@/lib/redeem-cookie";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ redeem?: string; from?: string }> }) {
  const { redeem, from } = await searchParams;
  // Arrived from the homepage check: say their check is waiting, not a generic welcome.
  const fromCheck = from === "check";
  // Arrived from a /redeem?code= link without an account (see lib/redeem-cookie.ts).
  const code = redeem ? cleanRedeemCode((await cookies()).get(REDEEM_COOKIE)?.value) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-balance text-xl font-semibold tracking-tight text-foreground">
          {code ? "Create your account to use your code" : fromCheck ? "Your check is saved. One step left." : "Create your free account"}
        </h1>
        <p className="mt-1.5 text-pretty text-sm text-muted-foreground">
          {code
            ? "It's free. Your code switches on Pro as soon as you're in."
            : fromCheck
              ? "Create a free account and Work-ly opens your full report and starts on the application. Nothing to paste again."
              : "No card needed. Check any job against your resume and get a straight answer in about a minute."}
        </p>
      </div>
      {code && (
        <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Your code <span className="font-mono font-semibold">{code}</span> is saved on this device. Already have an account?{" "}
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/redeem?code=${code}`)}`}
              className="font-medium underline underline-offset-2"
            >
              Sign in instead
            </Link>
            .
          </span>
        </p>
      )}
      <SignUpForm />
    </div>
  );
}
