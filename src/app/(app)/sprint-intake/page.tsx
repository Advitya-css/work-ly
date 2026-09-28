import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/auth";
import { BUSINESS } from "@/lib/business";
import { pool } from "@/lib/db/pool";
import { lookUpOfferCheckout } from "@/lib/payments/offer-checkout";
import { sprintForUser } from "@/lib/sprint";
import { SPRINT_DAYS } from "@/lib/sprint-core";
import { submitSprintIntakeAction } from "@/lib/sprint-actions";

export const metadata: Metadata = { title: "Your Application Sprint" };
export const dynamic = "force-dynamic";

/**
 * Where a Sprint buyer lands after checkout (?checkout_id=...), and the
 * link in their confirmation email. Confirms the payment with Polar
 * directly, so Pro and the form are there even if the webhook is late.
 */
export default async function SprintIntakePage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_id?: string; sent?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/sprint-intake");
  const params = await searchParams;

  let pending = false;
  if (params.checkout_id) {
    const result = await lookUpOfferCheckout(params.checkout_id, user.id);
    pending = result.status === "pending";
  }

  const sprint = await sprintForUser(user.id);
  if (!sprint) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pt-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your Application Sprint</h1>
        {pending ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            Your payment is still being confirmed. Refresh this page in a minute - the form appears as soon as it clears.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            There&apos;s no Sprint on this account yet. If you&apos;ve just paid, refresh in a minute, or email{" "}
            <a className="text-foreground underline underline-offset-2" href={`mailto:${BUSINESS.supportEmail}`}>
              {BUSINESS.supportEmail}
            </a>{" "}
            from the address you paid with.
          </p>
        )}
        <Button asChild variant="outline" className="w-fit">
          <Link href="/sprint">About the Sprint</Link>
        </Button>
      </div>
    );
  }

  if (sprint.status !== "paid" || params.sent) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pt-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <CheckCircle2 className="size-6 text-primary" aria-hidden />
          {sprint.status === "delivered" ? "Your Sprint is complete" : "Your Sprint has started"}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {sprint.status === "delivered"
            ? "Thanks for doing the Sprint. Your Pro access keeps running - keep checking each posting before you apply."
            : `Thanks - I have everything I need. Your resume review arrives by email within one business day, and your five applications within ${SPRINT_DAYS} days. Reply to any of my emails with questions.`}
        </p>
        <Button asChild className="w-fit">
          <Link href="/dashboard">Go to your dashboard</Link>
        </Button>
      </div>
    );
  }

  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM documents WHERE "userId" = $1`, [user.id]);
  const hasResume = Number(rows[0]?.n ?? 0) > 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pt-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Start your Application Sprint</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Pro is on for your account. Your {SPRINT_DAYS} days start when you send this form - it takes about three minutes.
        </p>
      </div>

      {!hasResume && (
        <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
          First, add your resume so I can review it:{" "}
          <Link href="/career-profile" className="font-medium text-primary underline underline-offset-2">
            upload it here
          </Link>
          , then come back to this page.
        </p>
      )}

      <form action={submitSprintIntakeAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="roles">Which roles are you going for?</Label>
          <Input id="roles" name="roles" required maxLength={300} placeholder="e.g. Data analyst, junior BI developer" />
          {params.error === "roles" && (
            <p role="alert" className="text-sm text-destructive">
              Tell me at least one role.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="postings">Up to five job postings (one link per line)</Label>
          <Textarea id="postings" name="postings" rows={5} maxLength={3000} placeholder="https://..." />
          <p className="text-xs text-muted-foreground">No postings yet? Leave this empty and we&apos;ll pick them from your matches.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="situation">Your situation and any deadline</Label>
          <Input id="situation" name="situation" maxLength={300} placeholder="e.g. Laid off in August, need a role by January" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="call_times">Good times for a 20-minute call around day 7 (with your time zone)</Label>
          <Input id="call_times" name="call_times" maxLength={300} placeholder="e.g. Weekday evenings, US Eastern" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">Anything else I should know?</Label>
          <Textarea id="notes" name="notes" rows={4} maxLength={2000} />
        </div>
        <Button type="submit" size="lg" className="w-fit">
          Start my Sprint
        </Button>
      </form>
    </div>
  );
}
