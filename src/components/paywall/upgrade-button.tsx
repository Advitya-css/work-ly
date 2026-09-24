"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "./upgrade-modal";

interface UpgradeButtonProps {
  interval?: "monthly" | "quarterly" | "yearly";
  className?: string;
  variant?: any;
}

export function UpgradeButton({ interval = "monthly", className, variant }: UpgradeButtonProps) {
  return (
    <UpgradeModal defaultPlan={interval} title="Work-ly Pro (Coming Soon)" description="Public checkouts are temporarily paused. Beta testers can redeem their invite codes below.">
      <Button size="lg" variant={variant} className={`gap-2 w-full sm:w-auto ${className || ""}`}>
        <Sparkles className="size-4" />
        Join Beta Waitlist
      </Button>
    </UpgradeModal>
  );
}
