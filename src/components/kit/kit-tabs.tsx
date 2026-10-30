"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

export interface KitTab {
  href: string;
  label: string;
  ready: boolean;
}

/** The four documents of the kit, each marked written or not. */
export function KitTabs({ tabs, locked }: { tabs: KitTab[]; locked: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Application kit" className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-2.5 py-2.5 text-[13.5px] font-medium transition-colors",
              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {locked && !tab.ready ? (
              <Lock className="size-3.5 text-muted-foreground" aria-hidden />
            ) : tab.ready ? (
              <span className="flex size-4 items-center justify-center rounded-full bg-success/15 text-success" aria-hidden>
                <Check className="size-2.5" strokeWidth={3} />
              </span>
            ) : (
              <span className="size-3.5 rounded-full border border-dashed border-muted-foreground/60" aria-hidden />
            )}
            {tab.label}
            <span className="sr-only">{tab.ready ? "(written)" : "(not written yet)"}</span>
          </Link>
        );
      })}
    </nav>
  );
}
