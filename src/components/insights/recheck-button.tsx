"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorklyLoader } from "@/components/shared/workly-loader";
import { recheckReadinessNowAction } from "@/lib/insights/actions";

export function RecheckButton({ dreamJobId }: { dreamJobId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1.5 sm:items-end">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const result = await recheckReadinessNowAction(dreamJobId);
            setMessage(result.error ?? `Re-checked: ${result.score}/100.`);
            if (!result.error) router.refresh();
          })
        }
      >
        {pending ? <WorklyLoader className="size-4 animate-spin" /> : <RefreshCw />}
        {pending ? "Re-checking..." : "Re-check now"}
      </Button>
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
