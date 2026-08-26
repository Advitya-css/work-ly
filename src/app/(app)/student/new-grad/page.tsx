import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { getCurrentUser } from "@/lib/auth";
import { LiveStudentJobsFeed } from "@/components/student/live-student-jobs-feed";
import { AlumniNetworkingCard } from "@/components/student/alumni-networking-card";
import { TransitionRoadmap } from "@/components/student/transition-roadmap";

export const metadata: Metadata = { title: "New Grad Launchpad" };

export default async function NewGradPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-8 pb-12">
      <PageHeader
        title="New Grad Launchpad"
        description="The tools you need to bridge the gap between graduation and your first full-time role."
      />

      <SectionTabs section="student" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlumniNetworkingCard />
        <TransitionRoadmap />
      </div>

      <LiveStudentJobsFeed type="new-grad" />
    </div>
  );
}
