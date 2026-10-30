import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { CardArea } from "@/components/ui/card";
import type { IconProps } from "@/components/icons";

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
 * The page header: a tight title, one muted line under it, actions on the
 * right. No icon chip and no coloured rule: the sidebar already says where
 * you are, and quiet headers are most of what makes a product feel calm.
 * (`area` and `icon` are still accepted so callers don't change.)
 */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 text-sm">{action}</div>}
    </div>
  );
}
