"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { seedDemoOpportunitiesAction } from "@/lib/opportunities/seed-demo";

export function SeedDemoButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = await seedDemoOpportunitiesAction();
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      setMessage(
        result.created > 0
          ? `Added ${result.created} demo opportunit${result.created === 1 ? "y" : "ies"}.`
          : "Demo opportunities are already loaded.",
      );
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {pending ? "Loading demo jobs…" : "Load demo opportunities"}
      </Button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
