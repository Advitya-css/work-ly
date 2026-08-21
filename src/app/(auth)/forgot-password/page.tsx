"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { forgotPasswordAction, type AuthActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: AuthActionState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  if (state.success) {
    return (
      <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center gap-6 pt-10">
        <div className="flex flex-col items-center gap-4 text-center py-6">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-6" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            If an account exists with that email, we&apos;ve sent a password reset link.
          </p>
          <Button asChild variant="outline" className="mt-2 w-full">
            <Link href="/login">Return to login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center gap-6 pt-10">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        {state.error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
          {state.fieldErrors?.email && (
            <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
          )}
        </div>

        <Button type="submit" className="mt-1 w-full" disabled={pending}>
          {pending ? "Sending link…" : "Send reset link"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
