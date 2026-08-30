"use client";

import { useActionState } from "react";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";

import { analyzeDreamJobAction, type DreamJobActionState } from "@/lib/dream-job/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { Lock } from "lucide-react";

const initialState: DreamJobActionState = {};

export function DreamJobForm({ isPro = false }: { isPro?: boolean }) {
  const [state, formAction, pending] = useActionState(analyzeDreamJobAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dream-role">Dream role</Label>
        <Input
          id="dream-role"
          name="dreamRole"
          placeholder="e.g. Senior Product Manager, Staff Engineer, Head of Design"
          disabled={pending}
        />
        {state.fieldErrors?.dreamRole && <p className="text-xs text-destructive">{state.fieldErrors.dreamRole}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dream-description">Job description</Label>
        <Textarea
          id="dream-description"
          name="description"
          rows={12}
          placeholder="Paste a real posting for this kind of role. An example job, a stretch role you found, or your own ideal listing. The more complete, the better the comparison."
          disabled={pending}
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-destructive">{state.fieldErrors.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dream-company">Company (optional)</Label>
        <Input id="dream-company" name="companyName" placeholder="e.g. a specific company you're aiming for" disabled={pending} />
      </div>

      {!isPro ? (
        <UpgradeModal title="Unlock Dream Job Analysis" description="Run a deep, AI-powered gap analysis against your ultimate dream job.">
          <Button type="button" className="w-fit gap-2">
            <Lock className="size-4" />
            See how close you are (Pro)
          </Button>
        </UpgradeModal>
      ) : (
        <Button type="submit" disabled={pending} className="w-fit gap-2">
          {pending ? (
            <>
              <Loader2 className="animate-spin size-4" />
              Analyzing…
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              See how close you are
            </>
          )}
        </Button>
      )}
    </form>
  );
}
