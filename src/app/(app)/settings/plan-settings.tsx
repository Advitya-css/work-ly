import { Crown, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { PricingCard } from "@/components/paywall/pricing-card";

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
            {isPro && (
              <Button variant="outline" asChild>
                <a href="https://app.lemonsqueezy.com/my-orders" target="_blank" rel="noopener noreferrer">
                  Manage Subscription
                </a>
              </Button>
            )}
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

