import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getPivotAction } from "@/lib/pivot/actions";
import { PivotWizard } from "./pivot-wizard";
import { IconPathway } from "@/components/icons";
import { EmptyState } from "@/components/shared/empty-state";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Career Pivot Copilot" };

export default async function CareerPivotPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!user.isPro) {
    return (
      <div className="flex flex-col gap-8 max-w-5xl">
        <PageHeader
          title="Career change"
          description="Describe your past work in the language of the field you're moving into."
          icon={IconPathway}
          area="pathway"
        />
        <EmptyState
          icon={Lock}
          title="Career Pivot is a Pro feature"
          description="Unlock the Career Pivot Copilot to get a tailored AI strategy to transition your career, map your transferable competencies, and generate a customized superpower pitch."
          action={{ label: "Upgrade to Pro", href: "/settings" }}
        />
      </div>
    );
  }

  const existingPivot = await getPivotAction();

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      <PageHeader
        title="Career change"
        description="Describe your past work in the language of the field you're moving into."
        icon={IconPathway}
        area="pathway"
      />
      
      <PivotWizard initialData={existingPivot} />
    </div>
  );
}
