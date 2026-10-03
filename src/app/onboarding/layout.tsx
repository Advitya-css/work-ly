import type { ReactNode } from "react";

// Always rendered per request: proxy.ts gives these pages the nonce-based
// script policy, which a cached page could not satisfy.
export const dynamic = "force-dynamic";

import { Logo } from "@/components/shared/logo";
import { PendingCodeCard } from "@/components/offers/pending-code-card";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="px-6 py-5">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-2xl">
          <PendingCodeCard />
          {children}
        </div>
      </main>
    </div>
  );
}
