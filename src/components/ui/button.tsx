import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Buttons, Linear-style: compact, crisp, with a hairline inner highlight on
 * the filled ones instead of a lift. Motion is a colour change, not a jump.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg",
    "text-sm font-medium tracking-[-0.006em] transition-[background-color,border-color,color,box-shadow] duration-150",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary-solid text-primary-solid-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_1px_2px_rgb(16_12_20/0.2)] hover:bg-primary-solid/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-destructive/90",
        outline:
          "border border-input bg-card text-foreground shadow-xs hover:bg-muted hover:border-foreground/15",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "text-foreground/80 hover:bg-muted hover:text-foreground",
        /** Tertiary actions that sit inline with text. */
        quiet: "text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 rounded-md px-3 text-[13px]",
        lg: "h-10 rounded-lg px-5 text-[15px]",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
