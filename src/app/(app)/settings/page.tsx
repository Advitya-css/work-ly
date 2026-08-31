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

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getCareerProfileByUserId(user.id);
  const isStudent = profile?.isStudent ?? false;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader title="Settings" description="Your account, where you will work, and your data." />
      <PlanSettings />

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
          <CardDescription>Tailor Workly for musicians, contractors, and freelancers.</CardDescription>
        </CardHeader>
        <CardContent>
          <FreelanceSettingsForm isFreelanceMode={profile?.isFreelanceMode ?? false} />
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Sign out of Workly on this device.</CardDescription>
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

      <PrivacyControls />
    </div>
  );
}
