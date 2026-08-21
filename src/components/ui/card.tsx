import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * A card: rounded, bordered, lifted. The familiar shape, because it is easy
 * to scan and easy to learn.
 *
 * What makes it Workly's rather than any component library's is `area`. Pass
 * an area and the card gets that part of the product's colour: a tinted wash
 * behind the header, and the same colour available to the icon and section
 * markers inside it. Opportunities are amber, career is plum, the pathway is
 * teal. After a day you know where you are before you read the heading.
 */
const AREA_STYLES = {
  opportunity: {
    "--area-color": "var(--area-opportunity)",
    "--area-tint": "var(--area-opportunity-tint)",
  },
  career: {
    "--area-color": "var(--area-career)",
    "--area-tint": "var(--area-career-tint)",
  },
  pathway: {
    "--area-color": "var(--area-pathway)",
    "--area-tint": "var(--area-pathway-tint)",
  },
  application: {
    "--area-color": "var(--area-application)",
    "--area-tint": "var(--area-application-tint)",
  },
  discover: {
    "--area-color": "var(--area-discover)",
    "--area-tint": "var(--area-discover-tint)",
  },
  dream: {
    "--area-color": "var(--area-dream)",
    "--area-tint": "var(--area-dream-tint)",
  },
} as const;

export type CardArea = keyof typeof AREA_STYLES;

const cardVariants = cva(
  "bg-card text-card-foreground flex flex-col rounded-xl border border-border overflow-hidden",
  {
    variants: {
      variant: {
        /** Sits on the page. */
        default: "shadow-sm",
        /** For a card that is itself a link or button. */
        interactive:
          "shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--area-color,var(--primary))]/35 hover:shadow-md",
        /** No lift, for cards nested inside another surface. */
        flat: "",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Card({
  className,
  variant,
  area,
  style,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & { area?: CardArea }) {
  return (
    <div
      data-slot="card"
      data-area={area}
      style={{ ...(area ? AREA_STYLES[area] : {}), ...style } as React.CSSProperties}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  );
}

/**
 * When the card has an area, the header carries that area's tint. Without
 * one it is a plain header, so nothing that has not opted in changes.
 */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 py-5",
        "has-[[data-slot=card-action]]:grid-cols-[1fr_auto]",
        "group-data-[area]/card:border-b",
        "[[data-area]>&]:border-b [[data-area]>&]:border-border [[data-area]>&]:bg-[var(--area-tint)]",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("flex items-center gap-2 text-base leading-snug font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm leading-relaxed", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6 py-5", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-5", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
};
