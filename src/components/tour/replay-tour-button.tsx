"use client";

import { useTour } from "@/components/tour/tour-provider";
import { Button } from "@/components/ui/button";

/**
 * The tour only runs at the `md` breakpoint and up (see tour-provider.tsx -
 * below that, the sidebar it points at isn't rendered). Hiding the trigger
 * itself on small screens means there's never a button here that quietly
 * does nothing when pressed.
 */
export function ReplayTourButton() {
  const { startTour } = useTour();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={startTour}
      className="hidden md:inline-flex"
    >
      Replay the tour
    </Button>
  );
}
