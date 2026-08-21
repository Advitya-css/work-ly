import { cn } from "@/lib/utils";

const STEPS = ["Welcome", "Upload CV", "Review"] as const;

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, index) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-[11px] font-medium",
                index === current
                  ? "bg-primary text-primary-foreground"
                  : index < current
                    ? "bg-success/15 text-success"
                    : "bg-secondary text-muted-foreground",
              )}
            >
              {index + 1}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                index === current ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </div>
          {index < STEPS.length - 1 && <div className="h-px w-6 bg-border" />}
        </div>
      ))}
    </div>
  );
}
