"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "./upgrade-modal";

interface UpgradeButtonProps {
  interval?: "monthly" | "yearly";
}

export function UpgradeButton({ interval = "monthly" }: UpgradeButtonProps) {
  return (
    <UpgradeModal 
      interval={interval}
      title="Unlock Work-ly Pro" 
      description="Get the ultimate unfair advantage in your job hunt."
    >
      <Button size="lg" className="gap-2 w-full sm:w-auto">
        <Sparkles className="size-4" />
        Upgrade Now
      </Button>
    </UpgradeModal>
  );
}
