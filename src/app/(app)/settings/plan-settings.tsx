import { CheckCircle2, Clock, Crown, RotateCw, TriangleAlert, Users, Zap } from "lucide-react";
import { CopyReferralLink } from "@/components/paywall/copy-referral-link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { PricingCard } from "@/components/paywall/pricing-card";
import Link from "next/link";
import { hasYearlyPerks } from "@/lib/plans";
import { PAID_PLANS } from "@/lib/pricing";
import { BUSINESS } from "@/lib/business";
import { restorePurchaseAction } from "@/lib/payments/polar";

/** What happened when we checked Polar for this account's payment (see settings/page.tsx). */
function PaymentNotice({
  payment,
  planName,
  pendingCheckout,
}: {
  payment: string | null;
  planName: string | null;
  pendingCheckout: string | null;
}) {
  const email = (
    <a href={`mailto:${BUSINESS.supportEmail}`} className="font-medium text-foreground underline underline-offset-2">
      {BUSINESS.supportEmail}
    </a>
  );
  switch (payment) {
    case "granted":
      return (
        <div role="status" className="flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <p>
            <strong className="text-foreground">Payment confirmed - you&apos;re on Work-ly Pro{planName ? ` (${planName})` : ""}.</strong>{" "}
            Every AI tool is unlocked now. A receipt is on its way to your email.
          </p>
        </div>
      );
    case "pending":
      return (
        <div role="status" className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <Clock className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div className="flex flex-col gap-2">
            <p>
              <strong className="text-foreground">Payment received - it&apos;s still being confirmed.</strong> This usually
              takes less than a minute.
            </p>
            <Link
              href={pendingCheckout ? `/settings?checkout_id=${encodeURIComponent(pendingCheckout)}` : "/settings?restore=1"}
              className="inline-flex w-fit items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
            >
              <RotateCw className="size-3.5" aria-hidden /> Check again
            </Link>
          </div>
        </div>
      );
    case "none":
      return (
        <div role="status" className="flex gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <p>
            We couldn&apos;t find a completed payment for this account. If you were charged, email {email} with your
            receipt and we&apos;ll switch Pro on the same day.
          </p>
        </div>
      );
    case "error":
      return (
        <div role="status" className="flex gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <p>
            We couldn&apos;t reach our payment provider just now. Your payment is safe - press Restore purchase in a minute,
            or email {email}.
          </p>
        </div>
      );
    default:
      return null;
  }
}

export async function PlanSettings({
  payment = null,
  pendingCheckout = null,
}: {
  payment?: string | null;
  pendingCheckout?: string | null;
} = {}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const isPro = user.isPro;
  const proUntil = user.proUntil;
  const paidPlan = PAID_PLANS.find((p) => p.interval === user.proPlan);
  // Beta and referral Pro are free trials, not purchases - they can still buy.
  const canBuy = !isPro || !paidPlan;

  return (
    <div id="plan" className="flex scroll-mt-24 flex-col gap-6">
      <PaymentNotice payment={payment} planName={paidPlan?.name ?? null} pendingCheckout={pendingCheckout} />
      <Card>
        <CardHeader>
          <CardTitle>Plan & Billing</CardTitle>
          <CardDescription>Manage your Work-ly subscription</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center justify-between p-5 bg-muted/30 rounded-xl border">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-lg flex items-center gap-2">
                Current Plan: {isPro ? <Badge className="bg-primary text-primary-foreground text-sm px-2 py-0.5"><Crown className="size-3 mr-1" /> Pro{paidPlan ? ` · ${paidPlan.name}` : ""}</Badge> : <Badge variant="secondary" className="text-sm px-2 py-0.5">Free</Badge>}
              </span>
              {hasYearlyPerks(user) && (
                <span className="text-sm text-muted-foreground">
                  Yearly perks are on: job watch, progress tracker and market value.{" "}
                  <Link href="/insights" className="font-medium text-primary underline-offset-4 hover:underline">
                    Open Insights
                  </Link>
                </span>
              )}
              {isPro && proUntil ? (
                <span className="text-sm text-muted-foreground">
                  Your Pro access is valid until <strong className="text-foreground">{new Date(proUntil).toLocaleDateString()}</strong>.
                </span>
              ) : isPro ? (
                <span className="text-sm text-muted-foreground">
                  You are currently subscribed to Work-ly Pro.
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  You are on the free tier. You can use basic tracking and discovery.
                </span>
              )}
            </div>
            
          </div>

          
          <div className="flex flex-col gap-3 p-5 bg-primary/5 rounded-xl border border-primary/20 mt-2">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <h3 className="font-semibold text-lg text-foreground">Earn free months of Pro</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Share your personal invite link below. When a friend signs up with your link and uploads their resume, <strong>you both get 1 free month of Pro.</strong> There is no limit to how many free months you can earn!
            </p>
            <div className="mt-2">
              <CopyReferralLink link={`https://www.work-ly.in/signup?ref=${user.id}`} />
            </div>
          </div>

          {isPro && proUntil && (
            <p className="text-sm text-muted-foreground bg-accent/50 p-4 rounded-lg border border-accent">
              <Zap className="size-4 inline mr-2 text-primary" />
              <strong>Want another month free?</strong> Fill out our beta feedback form and we will extend your Pro access by an additional month.
            </p>
          )}
        </CardContent>
      </Card>

      {canBuy && (
        <form action={restorePurchaseAction} className="-mt-2 flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
          Already paid?
          <Button type="submit" variant="link" size="sm" className="h-auto px-1">
            Restore purchase
          </Button>
        </form>
      )}

      {canBuy && <PricingCard />}
    </div>
  );
}

