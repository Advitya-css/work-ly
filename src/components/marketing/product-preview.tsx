import { Compass, LayoutDashboard, Route, SendHorizonal, Target, UserRound } from "lucide-react";

const miniNav = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Opportunities", icon: Compass, active: false },
  { label: "Career Profile", icon: UserRound, active: false },
  { label: "Career Goals", icon: Target, active: false },
  { label: "Career Path", icon: Route, active: false },
  { label: "Applications", icon: SendHorizonal, active: false },
];

const opportunities = [
  { role: "Senior Product Designer", company: "Linear", score: 92, tag: "Strong fit" },
  { role: "Staff Product Manager", company: "Ramp", score: 78, tag: "Worth a look" },
  { role: "Design Lead", company: "Vercel", score: 54, tag: "Stretch role" },
];

export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/10 ring-1 ring-black/[0.02]">
        {/* window chrome */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-destructive/40" />
          <span className="size-2.5 rounded-full bg-warning/50" />
          <span className="size-2.5 rounded-full bg-success/50" />
        </div>

        <div className="flex">
          {/* mini sidebar */}
          <div className="hidden w-44 shrink-0 border-r border-border bg-sidebar p-3 sm:block">
            <div className="mb-4 flex items-center gap-1.5 px-1">
              <span className="flex size-4 items-center justify-center rounded bg-primary">
                <svg viewBox="0 0 24 24" fill="none" className="size-2.5">
                  <path d="M4 12L10 18L20 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-xs font-semibold text-sidebar-foreground">Work-ly</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {miniNav.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium ${
                    item.active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70"
                  }`}
                >
                  <item.icon className="size-3" strokeWidth={1.75} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* content */}
          <div className="flex-1 p-5">
            <p className="text-[11px] font-medium text-muted-foreground">Prioritized for you</p>
            <div className="mt-3 flex flex-col gap-2.5">
              {opportunities.map((opp) => (
                <div
                  key={opp.role}
                  className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                >
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{opp.role}</p>
                    <p className="text-[11px] text-muted-foreground">{opp.company} · {opp.tag}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${opp.score}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-[11px] font-semibold tabular-nums text-foreground">
                      {opp.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
