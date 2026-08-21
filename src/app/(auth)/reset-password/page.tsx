"use client";

import { useActionState, use } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { resetPasswordAction, type AuthActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: AuthActionState = {};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = use(searchParams);
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  if (!token) {
    return (
      <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center gap-6 pt-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-lg font-semibold text-foreground">Invalid link</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is missing or malformed.
          </p>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center gap-6 pt-10">
        <div className="flex flex-col items-center gap-4 text-center py-6">
          <div className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-6" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Password reset</h2>
          <p className="text-sm text-muted-foreground">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <Button asChild className="mt-2 w-full">
            <Link href="/login">Go to login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center gap-6 pt-10">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Set new password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your new password below.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="token" value={token} />
        
        {state.error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
          {state.fieldErrors?.password ? (
            <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
          ) : (
            <p className="text-xs text-muted-foreground">At least 12 characters, mixed case and numbers.</p>
          )}
        </div>

        <Button type="submit" className="mt-1 w-full" disabled={pending}>
          {pending ? "Resetting…" : "Reset password"}
        </Button>
      </form>
    </div>
  );
}
