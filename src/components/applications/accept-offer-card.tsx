"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { acceptOfferAction } from "@/lib/applications/actions";

/**
 * Shown while an application is at "Offer". Receiving an offer no longer
 * edits the profile by itself - the user may still negotiate or decline -
 * so adding the job to the profile is this explicit step.
 */
export function AcceptOfferCard({
  applicationId,
  roleTitle,
  company,
}: {
  applicationId: string;
  roleTitle: string;
  company: string | null;
}) {
  const checkboxId = useId();
  const [endOthers, setEndOthers] = useState(true);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function accept() {
    setResult(null);
    startTransition(async () => {
      const res = await acceptOfferAction(applicationId, { endOtherCurrentRoles: endOthers });
      if ("error" in res) {
        setResult({ ok: false, message: res.error });
      } else {
        setResult({
          ok: true,
          message: res.alreadyAdded
            ? "This role was already on your profile."
            : `Added ${roleTitle}${company ? ` at ${company}` : ""} to your profile as your current role.`,
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BadgeCheck className="size-5 shrink-0 text-success" aria-hidden />
          Accepted this offer?
        </CardTitle>
        <CardDescription>
          Add the job to your career profile so your pathway, fit scores and tailored resumes start
          from your new role. Nothing changes until you confirm.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {result?.ok ? (
          <p className="text-sm text-foreground" role="status">
            {result.message}{" "}
            <Link href="/career-profile" className="font-medium text-primary underline-offset-4 hover:underline">
              View profile
            </Link>
          </p>
        ) : (
          <>
            <div className="flex items-start gap-2.5">
              <Checkbox
                id={checkboxId}
                checked={endOthers}
                onCheckedChange={(v) => setEndOthers(v === true)}
                className="mt-0.5"
              />
              <label htmlFor={checkboxId} className="text-sm leading-snug text-muted-foreground">
                Mark my other current jobs as ended today
              </label>
            </div>
            <Button onClick={accept} disabled={pending} className="w-full sm:w-fit">
              {pending ? "Updating profile..." : "I accepted - add to my profile"}
            </Button>
            {result && !result.ok && (
              <p className="text-sm text-destructive" role="alert">
                {result.message}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
