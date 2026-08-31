"use client";

import { useState } from "react";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCheckoutUrl } from "@/lib/payments/lemonsqueezy";

interface UpgradeButtonProps {
  interval?: "monthly" | "yearly";
}

export function UpgradeButton({ interval = "monthly" }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const { url } = await createCheckoutUrl(interval);
      if (url) window.location.href = url;
    } catch (error) {
      console.error(error);
      alert("Failed to generate checkout link. Please make sure all environment variables are set.");
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleUpgrade} disabled={loading} size="lg" className="gap-2 w-full sm:w-auto">
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      {interval === "yearly" ? "Upgrade to Pro - $120/yr" : "Upgrade to Pro - $15/mo"}
      {!loading && <ArrowRight className="size-4 ml-1" />}
    </Button>
  );
}
