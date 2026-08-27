"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { ExitStudentModeButton } from "@/components/student/student-mode-buttons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { AuthUser } from "@/lib/auth/types";

export function MobileTopbar({ user, student = false }: { user: AuthUser; student?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
      <Link href={student ? "/student" : "/dashboard"}>
        <Logo />
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </Button>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetHeader className="border-b border-sidebar-border">
            <SheetTitle className="text-left font-normal flex items-center h-8">
              <Logo />
            </SheetTitle>
            <SheetDescription className="sr-only">Main navigation</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
            <div className="flex flex-col gap-4">
              {student && (
                <p className="rounded-lg bg-sidebar-accent/60 px-2.5 py-1.5 text-xs font-medium text-sidebar-accent-foreground">
                  Student mode
                </p>
              )}
              <SidebarNav variant="primary" student={student} onNavigate={() => setOpen(false)} />
            </div>
            <div className="flex flex-col gap-1">
              <SidebarNav variant="secondary" student={student} onNavigate={() => setOpen(false)} />
              {student && <ExitStudentModeButton />}
            </div>
          </div>
          <div className="border-t border-sidebar-border p-2">
            <UserMenu user={user} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
