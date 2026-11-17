import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getPivotAction } from "@/lib/pivot/actions";
import { PivotWizard } from "./pivot-wizard";
import { IconPathway } from "@/components/icons";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Career change" };

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
          title="Career change is part of Pro"
          description="Work-ly reads what you've already done and writes it again in the words your new field uses, says which of your skills carry over, and names what you'd still need."
          action={{ label: "See Pro plans", href: "/pricing" }}
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
