"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { JOBS_TABS, CAREER_TABS, STUDENT_TABS } from "@/lib/nav-config";

/**
 * The second level of navigation, sitting under a page header.
 *
 * This is what let the sidebar drop from ten entries to four: the screens
 * that used to be listed there are now reached from the section they belong
 * to. A row of three or four related links is much easier to scan than a
 * ten-item list, because everything in it is obviously about one thing.
 *
 * Takes a section NAME rather than the tab array, for the same reason
 * SidebarNav takes a variant: the tab objects carry `icon` component
 * references, and React cannot serialize a function across the Server to
 * Client boundary. Passing the array in throws at request time, which a
 * production build will not catch because these pages are all dynamic.
 *
 * Rendered as links rather than a tab widget on purpose. These are separate
 * pages with their own URLs, and dressing real navigation up as tabs breaks
 * the back button and middle-click for no gain.
 */
const SECTIONS = {
  jobs: JOBS_TABS,
  career: CAREER_TABS,
  student: STUDENT_TABS,
} as const;

export type SectionName = keyof typeof SECTIONS;

export function SectionTabs({ section }: { section: SectionName }) {
  const pathname = usePathname();
  const tabs = SECTIONS[section];

  return (
    <nav aria-label="Section" className="-mx-1 overflow-x-auto">
      <ul className="flex items-center gap-1 px-1">
        {tabs.map((tab) => {
          // /student is a prefix of /student/jobs, so an exact check is
          // needed for the overview tab or it never turns off.
          const isActive =
            tab.href === "/student"
              ? pathname === "/student"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
