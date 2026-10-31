"use client";

import Image from "next/image";

import { useTour } from "@/components/tour/tour-provider";
import { Button } from "@/components/ui/button";

/** Opens the four-card welcome again, on any screen size. */
export function ReplayTourButton() {
  const { startTour } = useTour();

  return (
    <Button type="button" variant="outline" size="sm" onClick={startTour} className="gap-2">
      <Image src="/workly-bot-face.png" alt="" width={18} height={18} className="size-[18px] object-contain" />
      Replay the welcome
    </Button>
  );
}
