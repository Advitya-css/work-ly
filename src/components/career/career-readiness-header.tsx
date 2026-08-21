"use client";

import { Info, CircleCheck, Circle } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { ProfileCompleteness, CareerReadiness } from "@/lib/career/completeness";

export function CareerReadinessHeader({
  completeness,
  readiness,
}: {
  completeness: ProfileCompleteness;
  readiness: CareerReadiness;
}) {
  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">Career Readiness</p>
        <p className="text-lg font-semibold text-foreground">{readiness.label}</p>
        <p className="text-sm text-muted-foreground">{readiness.explanation}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Profile Completeness</p>
          <span className="text-sm font-semibold text-foreground">{completeness.percentage}% complete</span>
        </div>
        <Progress value={completeness.percentage} label="Career profile completeness" />
        {completeness.missing.length > 0 ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="link" size="sm" className="h-auto justify-start px-0 text-xs">
                <Info className="size-3.5" />
                What&apos;s missing?
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start">
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
        ) : (
          <p className="text-xs text-success">Your profile is fully filled out.</p>
        )}
      </div>
    </div>
  );
}
