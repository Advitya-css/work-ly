"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, HeartHandshake, PartyPopper, Send } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { STAGE_CHANGE_EVENT } from "@/lib/guidance/stage-events";
import { stageMomentFor, type StageChange, type StageMoment } from "@/lib/guidance/stage-moments";

const TIPS_OFF_KEY = "workly_stage_tips_off";

function tipsOff(): boolean {
  try {
    return window.localStorage.getItem(TIPS_OFF_KEY) === "1";
  } catch {
    return false;
  }
}

const TONE_ICON = {
  celebrate: PartyPopper,
  encourage: Send,
  console: HeartHandshake,
} as const;

/**
 * The pop-up shown when an application moves stage ("You got an interview -
 * here's how to prepare"). Mounted once in the app layout; anything that
 * changes an application's stage calls announceStageChange() and this
 * decides whether there's something worth saying (lib/guidance/stage-moments.ts).
 */
export function StageMomentHost({ isPro }: { isPro: boolean }) {
  const [moment, setMoment] = useState<StageMoment | null>(null);
  const [open, setOpen] = useState(false);
  const [silence, setSilence] = useState(false);
  const checkboxId = useId();

  useEffect(() => {
    function onChange(event: Event) {
      const change = (event as CustomEvent<StageChange>).detail;
      if (!change || tipsOff()) return;
      const next = stageMomentFor(change);
      if (!next || next.actions.length === 0) return;
      setMoment(next);
      setSilence(false);
      setOpen(true);
    }
    window.addEventListener(STAGE_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(STAGE_CHANGE_EVENT, onChange);
  }, []);

  function close() {
    if (silence) {
      try {
        window.localStorage.setItem(TIPS_OFF_KEY, "1");
      } catch {
        // Private mode or blocked storage: the tip just shows again next time.
      }
    }
    setOpen(false);
  }

  if (!moment) return null;
  const Icon = TONE_ICON[moment.tone];

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader className="items-center text-center sm:items-start sm:text-left">
          <div
            aria-hidden
            className={cn(
              "mb-1 flex size-11 items-center justify-center rounded-full",
              moment.tone === "console" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-5" />
          </div>
          <DialogTitle className="text-xl leading-snug text-balance">{moment.title}</DialogTitle>
          <DialogDescription className="leading-relaxed">{moment.body}</DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          {moment.actions.map((action) => (
            <li key={action.toolId}>
              <Link
                href={action.href}
                onClick={close}
                className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                    {action.label}
                    {action.pro && !isPro && (
                      <span className="rounded-full border border-border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Pro
                      </span>
                    )}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">{action.blurb}</span>
                </div>
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </li>
          ))}
        </ul>

        <DialogFooter className="flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Checkbox id={checkboxId} checked={silence} onCheckedChange={(v) => setSilence(v === true)} />
            <label htmlFor={checkboxId} className="text-xs text-muted-foreground">
              Don&apos;t show these tips again
            </label>
          </div>
          <Button variant="outline" onClick={close}>
            Not now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
