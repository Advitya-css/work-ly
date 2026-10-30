"use client";

import { Circle, CircleCheck, MapPin } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { ProfileCompleteness, CareerReadiness } from "@/lib/career/completeness";

/**
 * The top of the profile: who Work-ly thinks you are, at a glance, and how
 * complete that picture is. Replaces a "Career Readiness" box and a form
 * that opened the page.
 */
export function CareerReadinessHeader({
  completeness,
  readiness,
  identity,
}: {
  completeness: ProfileCompleteness;
  readiness: CareerReadiness;
  identity: { name: string | null; headline: string | null; role: string | null; company: string | null; location: string | null; years: number | null };
}) {
  const initials = (identity.name ?? identity.headline ?? "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const roleLine = [identity.role, identity.company ? `at ${identity.company}` : null].filter(Boolean).join(" ");
  const pct = completeness.percentage;
  const r = 26;
  const c = 2 * Math.PI * r;

  return (
    <section className="flex flex-col gap-5 feature-panel p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
          {initials}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">{identity.name ?? identity.headline ?? "Your profile"}</h2>
          {identity.headline && identity.name && <p className="truncate text-sm text-foreground/85">{identity.headline}</p>}
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
            {roleLine && <span>{roleLine}</span>}
            {identity.years != null && <span>{identity.years} yrs experience</span>}
            {identity.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {identity.location}
              </span>
            )}
          </p>
        </div>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" className="h-auto shrink-0 justify-start gap-3 rounded-xl px-3 py-2 text-left">
            <span className="relative size-16 shrink-0">
              <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-hidden>
                <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-muted" />
                <circle
                  cx="32"
                  cy="32"
                  r={r}
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(c * pct) / 100} ${c}`}
                  className="stroke-primary"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums text-foreground">{pct}%</span>
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">{readiness.label}</span>
              <span className="text-xs text-muted-foreground">
                {completeness.missing.length > 0 ? `${completeness.missing.length} things to add` : "Profile complete"}
              </span>
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end">
          <p className="mb-2 text-xs font-semibold text-foreground">To reach 100%</p>
          <ul className="flex flex-col gap-2">
            {completeness.checks.map((check) => (
              <li key={check.key} className="flex items-start gap-2 text-xs">
                {check.met ? (
                  <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
                ) : (
                  <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className={check.met ? "text-muted-foreground line-through" : "text-foreground"}>
                  {check.met ? check.label : check.hint}
                </span>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </section>
  );
}
