import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  ClipboardList,
  Code2,
  FileText,
  Mail,
  Mic,
  MoonStar,
  PenLine,
  Route,
  Search,
  Send,
  Shuffle,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { getCurrentUser } from "@/lib/auth";
import { listOpportunitiesByUserId } from "@/lib/db/opportunities";
import { loadSavedWork } from "@/lib/saved-work";
import { capitalise, describeSavedWork, totalSaved, kindLabel } from "@/lib/saved-work-core";
import { foundingOfferLine } from "@/lib/payments/founding";
import { PAID_PLANS } from "@/lib/pricing";
import { GUARANTEE } from "@/lib/business";
import { PRO_TOOL_GROUPS, accessLabel, toolHref, type ProTool, type ProToolIcon } from "@/lib/pro-tools";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My Pro" };

const ICONS: Record<ProToolIcon, LucideIcon> = {
  resume: FileText,
  letter: PenLine,
  note: Mail,
  prep: ClipboardList,
  mock: Mic,
  challenge: Code2,
  followup: Send,
  counter: Banknote,
  dream: Sparkles,
  plan: Route,
  pivot: Shuffle,
  linkedin: UserRound,
  nightly: MoonStar,
  search: Search,
};

const KIT_PATH: Record<string, string> = { resume: "resume", cover: "letter", note: "note", interview: "prep" };

function dateLabel(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * MY PRO. Everything Pro does, at a glance, for everyone.
 *
 * A member sees their hub: every tool one click away, what Work-ly has
 * already written for them, and their plan. Everyone else sees the same
 * page with each tool marked for what a free account gets, and one honest
 * way to upgrade. The list itself lives in lib/pro-tools.ts.
 */
export default async function MyProPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isPro = Boolean(user.isPro);
  const firstName = user.name?.trim().split(/\s+/)[0] ?? null;
  const [saved, opportunities, offerLine] = await Promise.all([
    loadSavedWork(user.id).catch(() => null),
    listOpportunitiesByUserId(user.id).catch(() => []),
    isPro ? Promise.resolve(null) : foundingOfferLine().catch(() => null),
  ]);
  // The kit tools open on a job: the one most recently written for, or
  // failing that the newest job they've checked.
  const latestJobId = saved?.items[0]?.opportunityId ?? opportunities[0]?.id ?? null;

  const planName =
    user.proPlan === "trial" ? "1-day trial" : (PAID_PLANS.find((p) => p.interval === user.proPlan)?.name ?? null);
  const until = dateLabel(user.proUntil);
  const writtenCount = saved ? totalSaved(saved.counts) : 0;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Image src="/workly-bot-face.png" alt="" width={64} height={64} className="size-14 shrink-0 object-contain" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Pro</h1>
            <p className="text-[15px] text-muted-foreground">
              {isPro
                ? `Hi${firstName ? ` ${firstName}` : ""}! This is everything you can ask me to do.`
                : "Here's everything I can do for you with Pro."}
            </p>
            {isPro && (planName || until) && (
              <p className="text-sm text-muted-foreground">
                {[planName, until ? `active until ${until}` : null].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
        {!isPro && (
          <UpgradeModal>
            <Button size="lg" className="w-fit gap-2">
              See Pro plans
              <ArrowRight className="size-4" />
            </Button>
          </UpgradeModal>
        )}
      </header>

      {!isPro && offerLine && (
        <p className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground">{offerLine}</p>
      )}

      {isPro && saved && writtenCount > 0 && (
        <section aria-labelledby="written-heading" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="written-heading" className="text-base font-semibold text-foreground">
              Written for you so far
            </h2>
            <p className="text-sm text-muted-foreground">{capitalise(describeSavedWork(saved.counts))}</p>
          </div>
          {saved.items.length > 0 && (
            <ul className="flex flex-col divide-y divide-border">
              {saved.items.slice(0, 3).map((item) => {
                const first = item.kinds.find((k) => KIT_PATH[k]);
                return (
                  <li key={item.opportunityId}>
                    <Link
                      href={`/opportunities/${item.opportunityId}/${first ? KIT_PATH[first] : "resume"}`}
                      className="group flex items-center justify-between gap-3 py-2.5 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground group-hover:underline group-hover:underline-offset-4">
                          {item.title}
                          {item.company ? ` at ${item.company}` : ""}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.kinds.map((k) => kindLabel(k)).join(" · ")}
                        </span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {PRO_TOOL_GROUPS.map((group) => (
          <section
            key={group.id}
            aria-labelledby={`group-${group.id}`}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-col gap-0.5">
              <h2 id={`group-${group.id}`} className="text-base font-semibold text-foreground">
                {group.title}
              </h2>
              <p className="text-sm text-muted-foreground">{group.line}</p>
            </div>
            <ul className="flex flex-col gap-1">
              {group.tools.map((tool) => (
                <ToolRow key={tool.name} tool={tool} isPro={isPro} latestJobId={latestJobId} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {isPro ? (
        <p className="text-center text-sm text-muted-foreground">
          Know someone looking?{" "}
          <Link href="/settings#invite" className="font-medium text-primary underline-offset-4 hover:underline">
            Invite them
          </Link>
          : when they buy Pro, you both get two extra weeks.
        </p>
      ) : (
        <div className="flex flex-col items-center gap-2 text-center">
          <UpgradeModal>
            <Button className="gap-2">
              See Pro plans
              <ArrowRight className="size-4" />
            </Button>
          </UpgradeModal>
          <p className="text-sm text-muted-foreground">{GUARANTEE.sentence}.</p>
        </div>
      )}
    </div>
  );
}

function ToolRow({ tool, isPro, latestJobId }: { tool: ProTool; isPro: boolean; latestJobId: string | null }) {
  const Icon = ICONS[tool.icon];
  const label = accessLabel(tool, isPro);
  return (
    <li>
      <Link
        href={toolHref(tool, latestJobId)}
        className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-foreground">{tool.name}</span>
          <span className="text-[13px] leading-snug text-muted-foreground">{tool.line}</span>
        </span>
        {label ? (
          <span
            className={cn(
              "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              label === "Pro" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {label}
          </span>
        ) : (
          <ArrowRight
            className="mt-1.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            aria-label="Open"
          />
        )}
      </Link>
    </li>
  );
}
