import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { ExitStudentModeButton } from "@/components/student/student-mode-buttons";
import type { AuthUser } from "@/lib/auth/types";

export function DesktopSidebar({ user, student = false }: { user: AuthUser; student?: boolean }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link href={student ? "/student" : "/dashboard"}>
          <Logo />
        </Link>
      </div>

      <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-4">
          {student && (
            <p className="rounded-lg bg-sidebar-accent/60 px-2.5 py-1.5 text-xs font-medium text-sidebar-accent-foreground">
              Student mode
            </p>
          )}
          <SidebarNav variant="primary" student={student} />
        </div>
        <div className="flex flex-col gap-1">
          <SidebarNav variant="secondary" student={student} />
          {student && <ExitStudentModeButton />}
        </div>
      </div>

      <div className="border-t border-sidebar-border p-2">
        <UserMenu user={user} />
      </div>
    </aside>
  );
}
