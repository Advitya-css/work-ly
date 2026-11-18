"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, MessageSquare, Settings, ChevronsUpDown, Gift } from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FeedbackDialog } from "@/components/shared/feedback-button";
import type { AuthUser } from "@/lib/auth/types";

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({ user, compact = false }: { user: AuthUser; compact?: boolean }) {
  const [feedback, setFeedback] = useState(false);

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent"
        >
          <Avatar className="size-7">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name ?? user.email} />
            <AvatarFallback className="text-[11px]">
              {initials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          {!compact && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user.name ?? "Your account"}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/70">{user.email}</p>
              </div>
              <ChevronsUpDown className="size-3.5 shrink-0 text-sidebar-foreground/40" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.name ?? "Your account"}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings#invite">
            <Gift />
            Invite a friend: 2 weeks each
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            // The dialog has to open after the menu has closed, or Radix
            // returns focus to a trigger that is no longer on the page.
            e.preventDefault();
            setFeedback(true);
          }}
        >
          <MessageSquare />
          Send feedback
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => signOutAction()}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <FeedbackDialog open={feedback} onOpenChange={setFeedback} />
    </>
  );
}
