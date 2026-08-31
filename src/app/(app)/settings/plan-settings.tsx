import { CheckCircle2, Crown, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { UpgradeButton } from "@/components/paywall/upgrade-button";

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
          <CardDescription>Manage your Workly subscription</CardDescription>
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
                  You are currently subscribed to Workly Pro.
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
        <Card className="border-primary/20 shadow-sm bg-gradient-to-br from-background to-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="size-6 text-primary" />
              Workly Pro
            </CardTitle>
            <CardDescription>Unlock the ultimate unfair advantage in your job hunt.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <ul className="space-y-3 text-sm font-medium">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                <span><strong>Unlimited AI Dream Job Analyses</strong><br/><span className="text-muted-foreground font-normal">Deep gap analysis against any role.</span></span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                <span><strong>AI Resume Tailoring</strong><br/><span className="text-muted-foreground font-normal">Rewrite your resume to beat ATS systems.</span></span>
              </li>
            </ul>
            <ul className="space-y-3 text-sm font-medium">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                <span><strong>The Dream Pathway</strong><br/><span className="text-muted-foreground font-normal">Personalized 30-day coaching plans.</span></span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                <span><strong>Interview Simulator</strong><br/><span className="text-muted-foreground font-normal">Live behavioral & tech sandboxes.</span></span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6">
            <div className="flex flex-col">
              <span className="text-2xl font-bold">$15<span className="text-base font-normal text-muted-foreground"> / month</span></span>
              <span className="text-xs text-muted-foreground">Secure checkout powered by Lemon Squeezy.</span>
            </div>
            <UpgradeButton />
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

function Sparkles(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
