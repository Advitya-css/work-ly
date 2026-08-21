import { cn } from "@/lib/utils";

/**
 * A coloured monogram standing in for a company logo.
 *
 * A list of job cards with nothing but words on it is genuinely hard to
 * scan: every row looks the same, so finding the one you were looking at a
 * minute ago means reading rather than recognising. A stable colour and
 * initial per employer gives each card a fixed visual anchor, which is what
 * makes a list feel navigable rather than uniform.
 *
 * The colour is derived from the name, so the same company is always the
 * same colour, across sessions and across screens, with no stored state and
 * no network request for a favicon that may not exist.
 *
 * The palette is drawn from the product's own area colours rather than
 * arbitrary hues, so a page of these still looks like one product. All are
 * used as a tinted background behind a foreground of the same hue, which
 * keeps text contrast well clear of the 4.5:1 line.
 */
const PALETTE = [
  { bg: "var(--area-opportunity-tint)", fg: "var(--area-opportunity)" },
  { bg: "var(--area-career-tint)", fg: "var(--area-career)" },
  { bg: "var(--area-pathway-tint)", fg: "var(--area-pathway)" },
  { bg: "var(--area-application-tint)", fg: "var(--area-application)" },
  { bg: "var(--area-discover-tint)", fg: "var(--area-discover)" },
  { bg: "var(--area-dream-tint)", fg: "var(--area-dream)" },
];

/** Stable, order-independent hash so a name always lands on the same colour. */
function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h << 5) - h + value.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Up to two letters: initials for multi-word names, first two otherwise. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function CompanyMonogram({
  name,
  size = "md",
  className,
}: {
  name: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const label = name?.trim() || "Unknown";
  const colour = PALETTE[hash(label) % PALETTE.length];

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg font-semibold tracking-tight select-none",
        size === "sm" && "size-8 text-[11px]",
        size === "md" && "size-10 text-xs",
        size === "lg" && "size-12 text-sm",
        className,
      )}
      style={{ backgroundColor: colour.bg, color: colour.fg }}
    >
      {initials(label)}
    </span>
  );
}
