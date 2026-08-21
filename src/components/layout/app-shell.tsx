import type { ReactNode } from "react";

import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileTopbar } from "@/components/layout/mobile-topbar";
import { AskWorkly } from "@/components/chat/ask-workly";
import type { AuthUser } from "@/lib/auth/types";

export function AppShell({
  user,
  student = false,
  children,
}: {
  user: AuthUser;
  /** Student mode replaces the navigation at both breakpoints. */
  student?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <DesktopSidebar user={user} student={student} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MobileTopbar user={user} student={student} />
        <main className="flex-1 overflow-y-auto">
          {/* max-w-5xl, down from 6xl, and a wider gap. Shorter lines and
              two cards per row rather than three is most of what makes a
              dense page readable again. */}
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pt-8 pb-28 sm:px-6 md:px-8 md:pt-10">
            {children}
          </div>
        </main>
      </div>

      {/* Reachable from every signed-in screen, and it knows which one. */}
      <AskWorkly />
    </div>
  );
}
