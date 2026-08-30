"use client";

import { useTransition, useState, useOptimistic } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { updateFreelanceModeAction } from "@/lib/settings/freelance-actions";

export function FreelanceSettingsForm({
  isFreelanceMode,
}: {
  isFreelanceMode: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [optimisticMode, setOptimisticMode] = useOptimistic(
    isFreelanceMode,
    (_, newMode: boolean) => newMode
  );

  function onToggle(checked: boolean) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      setOptimisticMode(checked);
      const res = await updateFreelanceModeAction(checked);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="freelance-mode" className="text-base">
            Enable Gig & Musician Mode
          </Label>
          <p className="text-sm text-muted-foreground">
            Tailor discovery, AI coaching, and pipeline terminology for freelance and gig work.
          </p>
        </div>
        <Switch
          id="freelance-mode"
          checked={optimisticMode}
          onCheckedChange={onToggle}
          disabled={pending}
        />
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="size-4" />
          Preferences saved.
        </div>
      )}
    </div>
  );
}
