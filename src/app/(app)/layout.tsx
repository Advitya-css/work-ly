export const dynamic = "force-dynamic";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { TourProvider } from "@/components/tour/tour-provider";
import { StageMomentHost } from "@/components/guidance/stage-moment-host";
import { FeedbackButton } from "@/components/shared/feedback-button";
import { SampleDataBanner } from "@/components/shared/sample-data-banner";
import { getCurrentUser } from "@/lib/auth";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { TrialBanner } from "@/components/paywall/trial-banner";
import { summaryWithin } from "@/lib/saved-outputs";
import { foundingOfferLine } from "@/lib/payments/founding";
import { EMPTY_COUNTS } from "@/lib/saved-work-core";
import { PendingCodeCard } from "@/components/offers/pending-code-card";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  // Defense in depth - middleware already enforces this for every path in
  // this group, but a Server Component should never assume it was reached
  // through the route it expects.
  //
  // Redirects to the clear-session route rather than straight to /login.
  // Getting here means proxy.ts accepted the JWT but the user row behind it
  // is gone, so sending the browser to /login would just bounce it back
  // here - an infinite loop that renders as a blank white page. The route
  // handler deletes the cookie first, which is the only way to break it.
  // See src/app/api/auth/clear-session/route.ts for the full explanation.
  if (!user) {
    redirect("/api/auth/clear-session");
  }

  // Student mode swaps the entire navigation, so the shell has to know
  // before it renders. Read here rather than in each page so the sidebar
  // never disagrees with the page it is sitting next to.
  const onTrial = Boolean(user.isPro && user.proPlan === "trial" && user.proUntil);
  const [profile, trialSaved, offerLine] = await Promise.all([
    getCareerProfileByUserId(user.id),
    onTrial ? summaryWithin(user.id) : Promise.resolve(null),
    onTrial ? foundingOfferLine().catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <TourProvider>
      {profile?.isSampleData && <SampleDataBanner />}
      <AppShell user={user} student={profile?.isStudent ?? false}>
        {onTrial && user.proUntil && (
          <TrialBanner endsAt={user.proUntil} saved={trialSaved?.counts ?? EMPTY_COUNTS} offerLine={offerLine} />
        )}
        <PendingCodeCard />
        {children}
        {/* Feedback lives in the sidebar on desktop; this is the phone version. */}
        <FeedbackButton />
      </AppShell>
      <StageMomentHost isPro={user.isPro ?? false} />
    </TourProvider>
  );
}
