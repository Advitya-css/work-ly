export const dynamic = "force-dynamic";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { FeedbackButton } from "@/components/shared/feedback-button";
import { Mail } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";

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
  const profile = await getCareerProfileByUserId(user.id);

  return (
    <AppShell user={user} student={profile?.isStudent ?? false}>
      {children}
      {user.isPro ? (
        <FeedbackButton />
      ) : (
        <div className="fixed bottom-6 right-6 z-50 rounded-full bg-background/80 backdrop-blur-md border border-border px-4 py-2 shadow-sm">
          <a href="mailto:advitya@work-ly.in" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Mail className="size-4" />
            Contact us: advitya@work-ly.in
          </a>
        </div>
      )}
    </AppShell>
  );
}
