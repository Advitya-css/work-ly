import { Lightbulb, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
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

const CATEGORY_ORDER: SkillCategory[] = ["TECHNICAL", "TOOL", "DOMAIN", "SOFT", "LANGUAGE", "OTHER"];
const CATEGORY_GROUP: Record<SkillCategory, string> = {
  TECHNICAL: "Technical",
  TOOL: "Tools",
  DOMAIN: "Domain knowledge",
  SOFT: "Working with people",
  LANGUAGE: "Languages",
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
        <CardAction>
          <SkillDialog />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {confirmed.length === 0 ? (
          <EmptyState
            compact
            icon={Lightbulb}
            title="No skills added yet"
            description="Add a skill, or upload a CV to extract them automatically."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {CATEGORY_ORDER.filter((cat) => confirmed.some((s) => s.category === cat)).map((cat) => (
              <div key={cat} className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{CATEGORY_GROUP[cat]}</p>
                <ul className="flex flex-wrap gap-2">
                  {confirmed
                    .filter((s) => s.category === cat)
                    .map((skill) => (
                      <li
                        key={skill.id}
                        className="group inline-flex items-center gap-0.5 rounded-md border border-border bg-card py-1 pl-2.5 pr-2.5 text-[13px] text-foreground hover:pr-0.5 focus-within:pr-0.5 [@media(hover:none)]:pr-0.5"
                      >
                        <span>{skill.name}</span>
                        {skill.proficiency && (
                          <span className="text-xs text-muted-foreground">· {PROFICIENCY_LABEL[skill.proficiency]}</span>
                        )}
                        <SourceBadge source={skill.source} className="ml-1" />
                        <span className="flex w-0 items-center overflow-hidden opacity-0 transition-all group-hover:w-auto group-hover:opacity-100 group-focus-within:w-auto group-focus-within:opacity-100 [@media(hover:none)]:w-auto [@media(hover:none)]:opacity-100 [&_button]:size-6">
                          <SkillDialog skill={skill} />
                          <DeleteSkillButton id={skill.id} label={skill.name} />
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
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
