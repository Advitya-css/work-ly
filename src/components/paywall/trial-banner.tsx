import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";

/** "Pro trial: 5 hours left" across the top of the app while a one-day trial runs. */
export function TrialBanner({ endsAt }: { endsAt: Date }) {
  const hours = Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 3_600_000));
  const left = hours <= 1 ? "less than an hour left" : `${hours} hours left`;
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm text-foreground">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span>
          <span className="font-semibold">Pro trial: {left}.</span>{" "}
          <span className="text-muted-foreground">Try a tailored resume on a real job before it ends.</span>
        </span>
      </p>
      <UpgradeModal title="Keep Work-ly Pro" defaultPlan="quarterly">
        <Button size="sm" className="shrink-0">
          Keep Pro
        </Button>
      </UpgradeModal>
    </div>
  );
}
