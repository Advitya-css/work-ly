import { Lightbulb, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SourceBadge, TransferableSkillBadge } from "@/components/career/source-badge";
import { SkillDialog } from "@/components/career/sections/skill-dialog";
import { DeleteSkillButton } from "@/components/career/sections/delete-buttons";
import { TransferableSkillActions } from "@/components/career/sections/transferable-skill-actions";
import type { Skill, SkillCategory, SkillProficiency } from "@/lib/db/types";

const CATEGORY_LABEL: Record<SkillCategory, string> = {
  TECHNICAL: "Technical",
  SOFT: "Soft skill",
  DOMAIN: "Domain",
  TOOL: "Tool",
  LANGUAGE: "Language",
  OTHER: "Other",
};

const PROFICIENCY_LABEL: Record<SkillProficiency, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

export function SkillSection({ skills }: { skills: Skill[] }) {
  const confirmed = skills.filter((s) => !s.isTransferable);
  const suggested = skills.filter((s) => s.isTransferable);

  return (
    <Card id="skills">
      <CardHeader>
        <CardTitle>Skills</CardTitle>
        <CardDescription>What you know, with how confident we are in each one.</CardDescription>
        <CardAction>
          <SkillDialog />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {confirmed.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="No skills added yet"
            description="Add a skill, or upload a CV to extract them automatically."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {confirmed.map((skill) => (
              <li key={skill.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground">{skill.name}</p>
                    <Badge variant="secondary">{CATEGORY_LABEL[skill.category]}</Badge>
                    {skill.proficiency && <Badge variant="outline">{PROFICIENCY_LABEL[skill.proficiency]}</Badge>}
                  </div>
                  <SourceBadge source={skill.source} />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <SkillDialog skill={skill} />
                  <DeleteSkillButton id={skill.id} label={skill.name} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {suggested.length > 0 && (
          <div className="rounded-lg border border-dashed border-warning/30 bg-warning/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="size-4 text-warning" />
              <p className="text-sm font-semibold text-foreground">Potential transferable skills</p>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Suggested by AI based on things elsewhere in your profile. Not yet a confirmed skill. Review each
              one below.
            </p>
            <ul className="flex flex-col gap-3">
              {suggested.map((skill) => (
                <li
                  key={skill.id}
                  className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground">{skill.name}</p>
                      <Badge variant="secondary">{CATEGORY_LABEL[skill.category]}</Badge>
                      <TransferableSkillBadge />
                    </div>
                    {skill.transferableRationale && (
                      <p className="text-xs text-muted-foreground">{skill.transferableRationale}</p>
                    )}
                  </div>
                  <TransferableSkillActions id={skill.id} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
