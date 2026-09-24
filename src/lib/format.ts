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
  const code = (currency ?? "USD").toUpperCase();
  const isInr = code === "INR";
  // Rupee figures are an order of magnitude larger: ₹40,000 is a monthly
  // salary, not an annual one, and ₹25,00,000 reads as "25 lakh" in India.
  const determineSuffix = (val: number) => {
    if (isInr) return val < 1000 ? "/hr" : val < 200000 ? "/mo" : "/yr";
    if (val < 200) return "/hr";
    if (val < 10000) return "/mo";
    return "/yr";
  };
  const amount = (n: number) => {
    if (isInr) {
      if (n >= 100000) {
        const lakh = n / 100000;
        return `₹${Number.isInteger(lakh) ? lakh : lakh.toFixed(1)}L`;
      }
      return `₹${n.toLocaleString("en-IN")}`;
    }
    return `${code} ${n.toLocaleString("en-US")}`;
  };
  const fmt = (n: number) => `${amount(n)}${determineSuffix(n)}`;

  if (min != null && max != null) {
    const minSuffix = determineSuffix(min);
    const maxSuffix = determineSuffix(max);
    if (minSuffix === maxSuffix) {
      const upper = isInr ? amount(max) : max.toLocaleString("en-US");
      return `${amount(min)} – ${upper}${minSuffix}`;
    }
    return `${fmt(min)} – ${fmt(max)}`;
  }
  return fmt((min ?? max)!);
}
