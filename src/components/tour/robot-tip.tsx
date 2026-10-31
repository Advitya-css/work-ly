"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

function key(id: string) {
  return `workly_tip_${id}`;
}

/**
 * A one-time note from the robot the first time someone opens a page:
 * what they're looking at and what to do here. "Got it" puts it away for
 * good (per browser). Rendered only after mount, so the server and the
 * first paint never disagree about whether it's there.
 */
export function RobotTip({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      // Not on top of the welcome cards: tips start once those have been seen.
      if (window.localStorage.getItem("workly_has_seen_tour") !== "true") return;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser storage, which only exists after mount
      if (window.localStorage.getItem(key(id)) !== "1") setShow(true);
    } catch {
      // Storage blocked: skip the tip rather than show it on every visit.
    }
  }, [id]);

  function dismiss() {
    setShow(false);
    try {
      window.localStorage.setItem(key(id), "1");
    } catch {
      // ignore
    }
  }

  if (!show) return null;

  return (
    <aside
      role="note"
      aria-label={title}
      className="relative flex items-start gap-3.5 rounded-2xl border border-primary/20 bg-accent/60 p-4 pr-10 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 print:hidden"
    >
      <Image src="/workly-bot-face.png" alt="" width={40} height={40} className="size-10 shrink-0 object-contain" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
        <Button size="sm" variant="outline" onClick={dismiss} className="mt-2 w-fit bg-card">
          Got it
        </Button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss tip"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </aside>
  );
}
