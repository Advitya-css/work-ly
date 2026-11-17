import Link from "next/link";
import { ArrowUpRight, Compass, GraduationCap, MessagesSquare, Route, Sparkles, Shuffle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * THE REST OF WORK-LY, on Home. Checking a job and writing the application
 * is the core loop; these are the parts no resume tool has, and they used
 * to sit three menus deep. One row, one line each, every card a link.
 */
const FEATURES = [
  {
    icon: Compass,
    title: "Discover",
    body: "Jobs that fit what you've really done, each with a straight answer.",
    href: "/discover",
  },
  {
    icon: Sparkles,
    title: "Dream job",
    body: "How close you are to the role you want, and what's missing.",
    href: "/dream-job",
  },
  {
    icon: Route,
    title: "Action plan",
    body: "The gaps as week-by-week steps, each one you can finish.",
    href: "/career-path",
  },
  {
    icon: Shuffle,
    title: "Career change",
    body: "Your past work, in the language of the field you're moving to.",
    href: "/career-pivot",
  },
  {
    icon: MessagesSquare,
    title: "Mock interview",
    body: "Answer likely questions; every answer scored with what to add.",
    href: "/opportunities",
  },
  {
    icon: GraduationCap,
    title: "Student mode",
    body: "Campus jobs, internships and new-grad roles, with work-hour limits.",
    href: "/student",
  },
] as const;

export function MoreWorkly({ className }: { className?: string }) {
  return (
    <section aria-labelledby="more-heading" className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="more-heading" className="text-base font-semibold text-foreground">
          More Work-ly can do
        </h2>
        <Link href="/guide" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Full guide
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <li key={f.title}>
            <Link
              href={f.href}
              className="group flex h-full gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="size-4" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  {f.title}
                  <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </span>
                <span className="text-[13px] leading-snug text-muted-foreground">{f.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
