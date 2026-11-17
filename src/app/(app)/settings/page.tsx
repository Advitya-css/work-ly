import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { PlanSettings } from "./plan-settings";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { LocationSettingsForm } from "@/components/settings/location-settings-form";
import { PartTimeSettingsForm } from "@/components/settings/part-time-settings-form";
import { FreelanceSettingsForm } from "@/components/settings/freelance-settings-form";
import { ThemeSettingsForm } from "@/components/settings/theme-settings-form";
import { PrivacyControls } from "@/components/settings/privacy-controls";
import {
  EnterStudentModeButton,
  ExitStudentModeButton,
} from "@/components/student/student-mode-buttons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { signOutAction } from "@/lib/auth/actions";
import { syncPolarPurchases } from "@/lib/payments/polar-sync";
import { isPaidInterval } from "@/lib/payments/plan-intent";
import { SettingsTabs, type SettingsTabKey } from "@/components/settings/settings-tabs";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Back from Polar checkout (or an old success link): confirm the payment
  // with Polar now, then reload so the plan card shows the new plan.
  const params = await searchParams;
  const checkoutId = typeof params.checkout_id === "string" ? params.checkout_id : null;
  if (checkoutId || params.restore === "1") {
    const result = await syncPolarPurchases(user, checkoutId);
    const retry = checkoutId && result.status === "pending" ? `&checkout=${encodeURIComponent(checkoutId)}` : "";
    redirect(
      `/settings?payment=${result.status}${result.status === "granted" ? `&plan=${result.plan}` : ""}${retry}#plan`,
    );
  }
  const payment = typeof params.payment === "string" ? params.payment : null;
  const pendingCheckout = typeof params.checkout === "string" ? params.checkout : null;
  const chosenPlan = isPaidInterval(params.plan) && !payment ? params.plan : null;

  const profile = await getCareerProfileByUserId(user.id);
  const isStudent = profile?.isStudent ?? false;

  const tabParam = typeof params.tab === "string" ? params.tab : null;
  const initialTab: SettingsTabKey =
    tabParam === "plans" || tabParam === "pricing" || tabParam === "billing" || payment || pendingCheckout || chosenPlan
      ? "plans"
      : tabParam === "preferences" || tabParam === "locations"
        ? "preferences"
        : tabParam === "privacy"
          ? "privacy"
          : "account";

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title="Settings" description="Your account, preferences, pricing, and data." />

      <SettingsTabs
        initialTab={initialTab}
        accountContent={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your name and contact details.</CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileSettingsForm user={user} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Switch between light and dark theme.</CardDescription>
              </CardHeader>
              <CardContent>
                <ThemeSettingsForm />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session</CardTitle>
                <CardDescription>Sign out of Work-ly on this device.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={signOutAction}>
                  <Button type="submit" variant="outline">
                    <LogOut />
                    Log out
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        }
        preferencesContent={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Locations</CardTitle>
                <CardDescription>
                  Where you are, and everywhere else you would take a job.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LocationSettingsForm profile={profile} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Part-Time Preferences</CardTitle>
                <CardDescription>
                  Optimize the discovery and scoring engines for part-time, hourly, and shift work.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PartTimeSettingsForm profile={profile} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Freelance & Gig Economy</CardTitle>
                <CardDescription>Tailor Work-ly for musicians, contractors, and freelancers.</CardDescription>
              </CardHeader>
              <CardContent>
                <FreelanceSettingsForm isFreelanceMode={profile?.isFreelanceMode ?? false} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Student mode</CardTitle>
                <CardDescription>
                  {isStudent
                    ? "Campus jobs and internships are currently prioritized. Leaving keeps your saved items."
                    : "Switch to campus jobs, internships, and student work rules."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isStudent ? (
                  <div className="w-fit">
                    <ExitStudentModeButton variant="outline" />
                  </div>
                ) : (
                  <EnterStudentModeButton />
                )}
              </CardContent>
            </Card>
          </>
        }
        plansContent={
          <PlanSettings payment={payment} pendingCheckout={pendingCheckout} chosenPlan={chosenPlan} />
        }
        privacyContent={
          <PrivacyControls />
        }
      />
    </div>
  );
}
