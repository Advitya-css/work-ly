"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  navGroups,
  secondaryNavItems,
  studentNavGroups,
  studentSecondaryNavItems,
} from "@/lib/nav-config";

/**
 * Takes a `variant` rather than an items array, and resolves the nav items
 * internally: a Server Component cannot pass icon component references down
 * as props into a Client Component, because React cannot serialize a
 * function across that boundary.
 *
 * The icons no longer carry their destination's area colour. Six accent
 * colours in a four-item list was decoration competing with the one thing
 * this list has to communicate, which is where you currently are. That is
 * now the only thing marked, with a filled pill.
 */
export function SidebarNav({
  variant,
  student = false,
  onNavigate,
}: {
  variant: "primary" | "secondary";
  /** Student mode swaps the whole navigation, it does not add to it. */
  student?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const primary = student ? studentNavGroups : navGroups;
  const secondary = student ? studentSecondaryNavItems : secondaryNavItems;
  const groups = variant === "primary" ? primary : [{ label: null, items: secondary }];

  return (
    <nav className="flex flex-col gap-5">
      {groups.map((group, index) => (
        <div key={group.label ?? `group-${index}`} className="flex flex-col gap-0.5">
          {group.label && <p className="eyebrow mb-1.5 px-2.5">{group.label}</p>}

          {group.items.map((item) => {
            // /student is a prefix of /student/jobs, so the overview link
            // would otherwise stay highlighted on every child page.
            const isActive =
              item.href === "/student"
                ? pathname === "/student"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
