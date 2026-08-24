"use client";

import { useActionState, use } from "react";
import Link from "next/link";
import { AlertCircle, Mail } from "lucide-react";

import { verifyEmailCodeAction, resendVerificationAction, type AuthActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: AuthActionState = {};

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = use(searchParams);
  const [verifyState, verifyAction, verifying] = useActionState(verifyEmailCodeAction, initialState);
  // resendState.success only flips once the server action actually returns
  // - no local "optimistic" flag here, so a failed resend (rate limited, a
  // transient DB error) shows its real error instead of a false "sent".
  const [resendState, resendAction, resending] = useActionState(resendVerificationAction, initialState);

  if (!email) {
    return (
      <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center gap-6 pt-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-lg font-semibold text-foreground">Missing email</h1>
          <p className="text-sm text-muted-foreground">
            We don&apos;t know which account to verify. Please sign up or log in again.
          </p>
          <Link href="/signup" className="text-sm font-medium text-primary hover:underline">
            Back to sign up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center gap-6 pt-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. Enter it below to
          finish creating your account.
        </p>
      </div>

      <form action={verifyAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="email" value={email} />

        {verifyState.error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{verifyState.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            className="text-center text-lg tracking-[0.5em]"
            required
            autoFocus
          />
        </div>

        <Button type="submit" className="mt-1 w-full" disabled={verifying}>
          {verifying ? "Verifying…" : "Verify email"}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-2 text-center">
        {resendState.success ? (
          <p className="text-sm text-muted-foreground">A new code is on its way. Check your inbox.</p>
        ) : (
          <>
            {resendState.error && <p className="text-xs text-destructive">{resendState.error}</p>}
            <form action={resendAction}>
              <input type="hidden" name="email" value={email} />
              <button
                type="submit"
                disabled={resending}
                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
              >
                {resending ? "Sending…" : "Didn't get a code? Resend it"}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
