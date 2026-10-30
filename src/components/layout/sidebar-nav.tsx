"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  CAREER_TABS,
  JOBS_TABS,
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
            const under = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
            // A section stays highlighted on every one of its tabs (Goals,
            // LinkedIn, Dream job... all live under "My career").
            const sectionTabs = item.href === "/career-profile" ? CAREER_TABS : item.href === "/opportunities" ? JOBS_TABS : null;
            const isActive =
              item.href === "/student"
                ? pathname === "/student"
                : under(item.href) || Boolean(sectionTabs?.some((tab) => under(tab.href)));
            const Icon = item.icon;
            // The tour (tour-provider.tsx) targets these sidebar entries by
            // a `tour-{route}` className derived from the href - e.g.
            // "/career-profile" -> "tour-career-profile". Keep this in sync
            // with any future rename; it's the only place that class is
            // added, and losing it silently breaks every tour step that
            // isn't the two body-centered ones.
            const tourClassName = `tour-${item.href.replace(/^\//, "").replace(/\//g, "-")}`;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  tourClassName,
                  "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors duration-100",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "opacity-80")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
