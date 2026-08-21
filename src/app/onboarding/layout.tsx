import type { ReactNode } from "react";

import { Logo } from "@/components/shared/logo";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="px-6 py-5">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
