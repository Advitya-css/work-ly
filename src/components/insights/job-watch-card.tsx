"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateJobWatchAction } from "@/lib/insights/actions";
import { YearlyUpgradeButton } from "./yearly-upgrade";

/**
 * Always-on job watch (yearly perk). Off by default; when on, a daily
 * background search emails only matches at or above the chosen Fit.
 */
export function JobWatchCard({
  unlocked,
  enabled: initialEnabled,
  minFit: initialMinFit,
  lastCheckedLabel,
}: {
  unlocked: boolean;
  enabled: boolean;
  minFit: number;
  lastCheckedLabel: string | null;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [minFit, setMinFit] = useState(initialMinFit);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function save(next: { enabled: boolean; minFit: number }) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateJobWatchAction(next);
      if (result.error) {
        setMessage(result.error);
        setEnabled(initialEnabled);
        setMinFit(initialMinFit);
      } else {
        setMessage(next.enabled ? `On. You'll hear from Work-ly only for Candidate Fit ${next.minFit}+.` : "Off.");
      }
    });
  }

  return (
    <section aria-labelledby="watch-title" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="watch-title" className="flex items-center gap-2 text-base font-semibold text-foreground">
            <BellRing className="size-4 text-primary" aria-hidden />
            Always-on job watch
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Work-ly keeps searching every day, even after you land a job, and emails you only when a new role clears
            your bar. Most weeks you&apos;ll hear nothing - that&apos;s the point.
          </p>
        </div>
        {unlocked && (
          <Switch
            checked={enabled}
            disabled={pending}
            aria-label="Always-on job watch"
            onCheckedChange={(v) => {
              setEnabled(v);
              save({ enabled: v, minFit });
            }}
          />
        )}
      </div>

      {unlocked ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">Email me for Candidate Fit of at least</span>
            <Select
              value={String(minFit)}
              disabled={pending}
              onValueChange={(v) => {
                const next = Number(v);
                setMinFit(next);
                save({ enabled, minFit: next });
              }}
            >
              <SelectTrigger size="sm" className="w-24" aria-label="Minimum Candidate Fit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[75, 80, 85, 90].map((v) => (
                  <SelectItem key={v} value={String(v)}>
                    {v}+
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {lastCheckedLabel && enabled && <p className="text-xs text-muted-foreground">Last searched {lastCheckedLabel}.</p>}
          {message && (
            <p role="status" className="text-xs text-muted-foreground">
              {message}
            </p>
          )}
        </div>
      ) : (
        <YearlyUpgradeButton />
      )}
    </section>
  );
}
