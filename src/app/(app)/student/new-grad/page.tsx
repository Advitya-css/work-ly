import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { getCurrentUser } from "@/lib/auth";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { listOpportunitiesWithJobByUserId } from "@/lib/opportunities/get-with-job";
import { StudentAutoDiscoveryCard } from "@/components/student/student-auto-discovery-card";
import { AlumniNetworkingCard } from "@/components/student/alumni-networking-card";
import { TransitionRoadmap, type TransitionRoadmapData } from "@/components/student/transition-roadmap";

export const metadata: Metadata = { title: "New Grad Launchpad" };

export default async function NewGradPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, opportunities] = await Promise.all([
    getCareerProfileByUserId(user.id),
    listOpportunitiesWithJobByUserId(user.id),
  ]);

  const roadmapData: TransitionRoadmapData = {
    hasResume: Boolean(profile?.resumeFileUrl),
    hasFoundationProfile: Boolean(profile?.headline && profile?.summary),
    trackedCount: opportunities.length,
    appliedCount: opportunities.filter((o) => o.status === "APPLIED").length,
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      <PageHeader
        title="New Grad Launchpad"
        description="The tools you need to bridge the gap between graduation and your first full-time role."
      />

      <SectionTabs section="student" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlumniNetworkingCard />
        <TransitionRoadmap data={roadmapData} />
      </div>

      <StudentAutoDiscoveryCard type="new-grad" />
    </div>
  );
}
