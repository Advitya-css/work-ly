import { cn } from "@/lib/utils";
import { useId } from "react";

/**
 * work-ly's actual brand mark: a W drawn as a rising line whose last stroke
 * keeps going past the letter and becomes an arrow. The colour carries the
 * same idea end to end, it starts deep plum at the base and lifts to violet
 * at the tip. The wordmark is lowercase with the hyphen, exactly as the
 * brand asset reads, rather than the "Workly" placeholder spelling used
 * earlier in the build.
 */
export function Logo({ className }: { className?: string }) {
  const gradientId = useId();

  return (
    <span className={cn("flex items-center gap-2 shrink-0", className)}>
      <svg viewBox="0 0 34 28" className="h-6 w-[29px] shrink-0" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="28" x2="34" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4A1942" />
            <stop offset="55%" stopColor="#7A2E55" />
            <stop offset="100%" stopColor="#B565D8" />
          </linearGradient>
        </defs>
        <path
          d="M2 8 L8 26 L13 13 L19 26 L30 2"
          stroke={`url(#${gradientId})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M30.85 7.34 L30 2 L25.4 4.84"
          stroke={`url(#${gradientId})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">work-ly</span>
    </span>
  );
}
