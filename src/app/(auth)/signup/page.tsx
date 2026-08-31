import type { Metadata } from "next";

import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Analyze your career
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your Work-ly account to get started
        </p>
      </div>
      <SignUpForm />
    </div>
  );
}
