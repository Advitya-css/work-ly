import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { CardArea } from "@/components/ui/card";
import type { IconProps } from "@/components/icons";

const AREA_VAR: Record<CardArea, { color: string; tint: string }> = {
  opportunity: { color: "var(--area-opportunity)", tint: "var(--area-opportunity-tint)" },
  career: { color: "var(--area-career)", tint: "var(--area-career-tint)" },
  pathway: { color: "var(--area-pathway)", tint: "var(--area-pathway-tint)" },
  application: { color: "var(--area-application)", tint: "var(--area-application-tint)" },
  discover: { color: "var(--area-discover)", tint: "var(--area-discover-tint)" },
  dream: { color: "var(--area-dream)", tint: "var(--area-dream-tint)" },
};

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Paints the icon chip and rule in this part of the product colour. */
  area?: CardArea;
  icon?: React.ComponentType<IconProps>;
  className?: string;
}

/**
 * The page header. Same compact shape as before, with one addition: a
 * round chip holding this area's icon in this area's colour, and a rule
 * underneath that fades from that colour into the border. It costs one line
 * of vertical space and tells you where you are before you read anything.
 */
export function PageHeader({
  title,
  description,
  action,
  area,
  icon: Icon,
  className,
}: PageHeaderProps) {
  const accent = area ? AREA_VAR[area] : null;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <span
              className="area-chip size-10 shrink-0"
              style={
                accent
                  ? ({ "--area-tint": accent.tint, "--area-color": accent.color } as React.CSSProperties)
                  : undefined
              }
            >
              <Icon className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div
        className="h-px w-full"
        style={{
          background: accent
            ? `linear-gradient(to right, ${accent.color}, var(--border) 22%)`
            : "var(--border)",
        }}
      />
    </div>
  );
}

/** A heading for a section within a page. */
export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-6", className)}>
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 text-sm">{action}</div>}
    </div>
  );
}
