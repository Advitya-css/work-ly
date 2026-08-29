
"use client";

import { useState } from "react";
import { Loader2, Sparkles, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runStudentDiscoveryAndTrackAction, type StudentDiscoveryType } from "@/lib/student/discovery-actions";
import { useRouter } from "next/navigation";

export function RunStudentDiscoveryButton({ type }: { type: StudentDiscoveryType }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [trackedCount, setTrackedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const router = useRouter();

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runStudentDiscoveryAndTrackAction(type);
      if (res.upgradeRequired) {
        setUpgradeRequired(true);
      } else if (res.error) {
        setError(res.error);
      } else if (!res.found) {
        setError("No jobs found in your area right now.");
      } else if (!res.tracked) {
        setError(`Found ${res.found} listing${res.found === 1 ? "" : "s"}, but none looked like a strong enough match to add automatically. Check Discover to review them yourself.`);
        router.refresh();
      } else {
        setTrackedCount(res.tracked);
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
        {trackedCount} job{trackedCount === 1 ? "" : "s"} added below
      </Button>
    );
  }

  if (upgradeRequired) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm text-foreground font-medium">
          You&apos;ve reached your daily limit of 3 AI discoveries.
        </p>
        <Button className="w-fit gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90">
          <Zap className="size-4 fill-current" />
          Unlock Unlimited Discovery
        </Button>
      </div>
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
