/** Shared, dependency-free date/text formatting helpers for the career profile UI. */

export function formatMonthYear(date: Date | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function formatDateRange(
  start: Date | null,
  end: Date | null,
  isCurrent?: boolean,
): string | null {
  const startLabel = formatMonthYear(start);
  const endLabel = isCurrent ? "Present" : formatMonthYear(end);
  if (startLabel && endLabel) return `${startLabel} – ${endLabel}`;
  if (startLabel) return startLabel;
  if (endLabel) return endLabel;
  return null;
}

export function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function formatSalaryRange(min: number | null, max: number | null, currency: string | null): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) => `${currency ?? "USD"} ${n.toLocaleString()}`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max)!);
}
