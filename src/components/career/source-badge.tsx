import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DataSource } from "@/lib/db/types";

const SOURCE_LABEL: Record<DataSource, string> = {
  CV: "From your CV",
  USER: "Added by you",
  PROJECT: "From a project",
  CERTIFICATION: "From a certification",
  AI_INFERENCE: "AI inferred",
};

/**
 * Always-visible provenance indicator. Per product principle #2, every
 * piece of profile data must be traceable back to whether it's a fact the
 * user (or their CV) supplied, or something the AI inferred - never blend
 * the two silently.
 */
export function SourceBadge({
  source,
  isUncertain,
  className,
}: {
  source: DataSource;
  isUncertain?: boolean;
  className?: string;
}) {
  const isInference = source === "AI_INFERENCE";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Badge variant={isInference ? "warning" : "outline"}>
        {isInference && <Sparkles />}
        {SOURCE_LABEL[source]}
      </Badge>
      {isUncertain && (
        <Badge variant="warning" title="Extracted from your CV but not yet confirmed by you">
          Unconfirmed
        </Badge>
      )}
    </span>
  );
}

/**
 * Exact wording is a product requirement (spec item #6) - a transferable
 * skill must never read as a proven fact.
 */
export function TransferableSkillBadge({ className }: { className?: string }) {
  return (
    <Badge variant="warning" className={cn(className)}>
      <Sparkles />
      Potential transferable skill
    </Badge>
  );
}
