import { CalendarCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";

/** The unlock button every yearly perk uses when it's locked: opens checkout on the Yearly Pass. */
export function YearlyUpgradeButton({ label = "Get it with the Yearly Pass" }: { label?: string }) {
  return (
    <UpgradeModal
      defaultPlan="yearly"
      title="Yearly Pass perks"
      description="Always-on job watch, a monthly career progress report, and your market value - the parts of Work-ly that keep working after you land the job."
    >
      <Button variant="outline" className="w-full gap-2 sm:w-fit">
        <CalendarCheck className="size-4" />
        {label}
      </Button>
    </UpgradeModal>
  );
}

/** Blurred placeholder bars for a locked perk's output - never invented numbers. */
export function LockedBars({ rows = 3 }: { rows?: number }) {
  const widths = ["w-2/3", "w-5/6", "w-1/2", "w-3/4"];
  return (
    <div aria-hidden className="relative select-none">
      <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 blur-[1.5px]">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={`h-3 rounded-full bg-muted-foreground/20 ${widths[i % widths.length]}`} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 rounded-b-md bg-gradient-to-t from-card to-transparent" />
    </div>
  );
}
