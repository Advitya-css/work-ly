import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconEmpty, type IconProps } from "@/components/icons";
import { IllustrationNoResults } from "@/components/shared/empty-illustration";
import type { CardArea } from "@/components/ui/card";

const AREA_VAR: Record<CardArea, { color: string; tint: string }> = {
  opportunity: { color: "var(--area-opportunity)", tint: "var(--area-opportunity-tint)" },
  career: { color: "var(--area-career)", tint: "var(--area-career-tint)" },
  pathway: { color: "var(--area-pathway)", tint: "var(--area-pathway-tint)" },
  application: { color: "var(--area-application)", tint: "var(--area-application-tint)" },
  discover: { color: "var(--area-discover)", tint: "var(--area-discover-tint)" },
  dream: { color: "var(--area-dream)", tint: "var(--area-dream-tint)" },
};

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  /**
   * A drawn scene, from shared/empty-illustration. Preferred: it reads as a
   * designed state rather than a broken one.
   */
  illustration?: React.ComponentType<{ className?: string }>;
  /** Legacy single icon. Still accepted so existing call sites keep working. */
  icon?: React.ComponentType<IconProps>;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  area?: CardArea;
  className?: string;
}

/**
 * The centred empty state.
 *
 * What changed is the ornament. It used to be one small outline icon in a
 * grey circle, which reads as an error rather than as an intentional state.
 * It is now a proper line drawing, larger, in a soft tinted panel, with the
 * heading and the action given room. Same information, but it looks like
 * somewhere you have arrived rather than somewhere that failed to load.
 */
export function EmptyState({
  illustration: Illustration,
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  area,
  className,
}: EmptyStateProps) {
  const accent = area ? AREA_VAR[area] : null;
  const style = accent
    ? ({ "--area-tint": accent.tint, "--area-color": accent.color } as React.CSSProperties)
    : undefined;

  // An explicit illustration wins. Otherwise a legacy icon is honoured, and
  // failing both there is a default scene rather than a bare circle.
  const Scene = Illustration ?? (Icon ? null : IllustrationNoResults);

  return (
    <div
      style={style}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-border/70 px-6 py-12 text-center",
        "bg-[var(--area-tint,var(--muted))]/40",
        className,
      )}
    >
      {Scene ? (
        // Sized generously on purpose: at 76px it read as a stray icon
        // floating in a large panel rather than as the point of the state.
        <Scene className="mb-5 h-[104px] w-[140px] text-[var(--area-color,var(--primary))]/70" />
      ) : (
        Icon && (
          <span className="area-chip mb-4 size-12">
            <Icon className="size-6" />
          </span>
        )
      )}

      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action &&
            (action.href ? (
              <Button asChild size="sm">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button size="sm" onClick={action.onClick}>
                {action.label}
              </Button>
            ))}
          {secondaryAction &&
            (secondaryAction.href ? (
              <Button asChild size="sm" variant="outline">
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
