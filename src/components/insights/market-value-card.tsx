import { Banknote, ExternalLink } from "lucide-react";

import { LockedBars, YearlyUpgradeButton } from "./yearly-upgrade";
import { MIN_SALARY_SAMPLE, formatMoney, type MarketValue, type RisingSkill } from "@/lib/insights/market-value";
import { displaySkill } from "@/lib/discovery/market-radar";

/**
 * Your market value (yearly perk): pay for roles you fit and rising skills,
 * counted from listings Work-ly found. Sample sizes are always shown.
 */
export function MarketValueCard({
  value,
  rising,
  targetRole,
  unlocked,
}: {
  value: MarketValue;
  rising: RisingSkill[];
  targetRole: string | null;
  unlocked: boolean;
}) {
  const role = targetRole ?? "roles like yours";
  return (
    <section aria-labelledby="market-title" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 id="market-title" className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Banknote className="size-4 text-primary" aria-hidden />
          Your market value
        </h2>
        <p className="text-sm text-muted-foreground">
          What employers state they pay for {role}, from {value.sample} listing{value.sample === 1 ? "" : "s"} with a
          salary Work-ly found in the last {Math.round(value.sinceDays / 30)} months. No estimates.
        </p>
      </div>

      {!unlocked ? (
        <>
          <LockedBars rows={2} />
          <YearlyUpgradeButton />
        </>
      ) : value.median == null ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          {value.sample === 0
            ? "No listings with a stated salary yet. Most employers don't publish pay; this fills in as Discover finds ones that do."
            : `${value.sample} of ${MIN_SALARY_SAMPLE} listings needed for a fair range so far. It fills in as Discover finds more that publish pay.`}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-border p-3 text-center">
            {[
              { label: "Lower quarter", amount: value.low },
              { label: "Typical", amount: value.median },
              { label: "Upper quarter", amount: value.high },
            ].map((cell) => (
              <div key={cell.label} className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{cell.label}</span>
                <span className={`truncate font-semibold tabular-nums text-foreground ${cell.label === "Typical" ? "text-lg" : "text-sm"}`}>
                  {formatMoney(cell.amount!, value.currency)}
                </span>
              </div>
            ))}
          </div>
          {value.strongMatchMedian != null && (
            <p className="text-sm text-muted-foreground">
              Roles Work-ly rates as a strong fit for you pay a typical{" "}
              <span className="font-medium text-foreground">{formatMoney(value.strongMatchMedian, value.currency)}</span>{" "}
              ({value.strongMatchSample} listings) - the number to anchor on when you negotiate.
            </p>
          )}
          {value.topPaying.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Best-paying right now</p>
              <ul className="flex flex-col gap-1 text-sm">
                {value.topPaying.map((l) => (
                  <li key={`${l.title}-${l.company}-${l.max}`} className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="min-w-0 text-foreground">
                      {l.url ? (
                        <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                          {l.title}
                          <ExternalLink className="size-3" aria-hidden />
                        </a>
                      ) : (
                        l.title
                      )}
                      {l.company ? <span className="text-muted-foreground"> · {l.company}</span> : null}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatMoney(l.min, value.currency)}
                      {l.max !== l.min ? ` – ${formatMoney(l.max, value.currency)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {unlocked && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rising in demand</p>
          {rising.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No clear shift yet. This compares the last month of listings with the two before it, once there are enough of both.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {rising.map((r) => (
                <li key={r.skill} className="flex justify-between gap-3 tabular-nums">
                  <span className="font-medium text-foreground">{displaySkill(r.skill)}</span>
                  <span className="text-muted-foreground">
                    {Math.round(r.earlierShare * 100)}% → {Math.round(r.recentShare * 100)}% of listings
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
