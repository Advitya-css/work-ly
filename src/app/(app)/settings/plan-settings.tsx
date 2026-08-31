import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";

export async function PlanSettings() {
  const user = await getCurrentUser();
  if (!user) return null;

  const isPro = user.isPro;
  const proUntil = user.proUntil;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan & Billing</CardTitle>
        <CardDescription>Manage your Workly subscription</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-lg flex items-center gap-2">
              Current Plan: {isPro ? <Badge className="bg-primary text-primary-foreground">Pro</Badge> : <Badge variant="secondary">Free</Badge>}
            </span>
            {isPro && proUntil && (
              <span className="text-sm text-muted-foreground">
                Your Pro access is valid until {new Date(proUntil).toLocaleDateString()}.
              </span>
            )}
            {!isPro && (
              <span className="text-sm text-muted-foreground">
                You are on the free tier. Upgrade to unlock AI features.
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Note: If you fill out our feedback form, we will extend your Pro access by an additional month!
        </p>
      </CardContent>
    </Card>
  );
}
