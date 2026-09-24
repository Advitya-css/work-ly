"use client";

import type { ComponentProps } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UpgradeModal } from "./upgrade-modal";

interface UpgradeButtonProps {
  interval?: "monthly" | "quarterly" | "yearly";
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  /**
   * Fill the parent at every width. The default (full width on phones,
   * natural width from `sm` up) used to win over a passed "w-full", so in
   * narrow pricing cards the button kept its natural width and ran past
   * the card's edge.
   */
  fullWidth?: boolean;
}

export function UpgradeButton({ interval = "monthly", className, variant, fullWidth = false }: UpgradeButtonProps) {
  return (
    <UpgradeModal
      defaultPlan={interval}
      title="Work-ly Pro (Coming Soon)"
      description="Public checkouts are temporarily paused. Beta testers can redeem their invite codes below."
    >
      <Button
        size="lg"
        variant={variant}
        className={cn(
          "h-auto min-h-11 gap-2 py-2.5 whitespace-normal text-center",
          fullWidth ? "w-full" : "w-full sm:w-auto",
          className,
        )}
      >
        <Sparkles className="size-4 shrink-0" />
        Join Beta Waitlist
      </Button>
    </UpgradeModal>
  );
}
