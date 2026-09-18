"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "./upgrade-modal";

interface UpgradeButtonProps {
  interval?: "monthly" | "yearly";
}

export function UpgradeButton({ interval = "monthly" }: UpgradeButtonProps) {
  return (
    <UpgradeModal title="Work-ly Pro (Coming Soon)" description="Public checkouts are temporarily paused. Beta testers can redeem their invite codes below.">
      <Button size="lg" className="gap-2 w-full sm:w-auto">
        <Sparkles className="size-4" />
        Join Beta Waitlist
      </Button>
    </UpgradeModal>
  );
}
