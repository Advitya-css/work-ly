import { Crown, Zap, Users } from "lucide-react";
import { CopyReferralLink } from "@/components/paywall/copy-referral-link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { PricingCard } from "@/components/paywall/pricing-card";
import Link from "next/link";
import { hasYearlyPerks } from "@/lib/plans";

export async function PlanSettings() {
  const user = await getCurrentUser();
  if (!user) return null;

  const isPro = user.isPro;
  const proUntil = user.proUntil;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Plan & Billing</CardTitle>
          <CardDescription>Manage your Work-ly subscription</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center justify-between p-5 bg-muted/30 rounded-xl border">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-lg flex items-center gap-2">
                Current Plan: {isPro ? <Badge className="bg-primary text-primary-foreground text-sm px-2 py-0.5"><Crown className="size-3 mr-1" /> Pro</Badge> : <Badge variant="secondary" className="text-sm px-2 py-0.5">Free</Badge>}
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

      {!isPro && (
        <PricingCard />
      )}
    </div>
  );
}

