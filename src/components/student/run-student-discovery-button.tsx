"use client";

import { useState } from "react";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runDiscoveryAction } from "@/lib/discovery/actions";
import { useRouter } from "next/navigation";

export function RunStudentDiscoveryButton({ type }: { type: "part-time" | "internship" | "new-grad" }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = "part time";
      if (type === "internship") query = "internship";
      if (type === "new-grad") query = "graduate entry level";

      const res = await runDiscoveryAction(query);
      if (res.error) {
        setError(res.error);
      } else if (res.found === 0) {
        setError("No jobs found in your area right now.");
      } else {
        setSuccess(true);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      setError("Failed to run discovery.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <Button variant="outline" disabled className="gap-2 text-primary border-primary">
        <CheckCircle2 className="size-4" />
        Jobs Tracked Successfully
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleRun} disabled={loading} className="w-fit gap-2">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {loading ? "Discovering Local Roles..." : "Auto-Discover Roles"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
