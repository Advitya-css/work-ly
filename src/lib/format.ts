/** Shared, dependency-free date/text formatting helpers for the career profile UI. */

/**
 * "Mar 2023". Dates are stored as UTC midnight, so they're read in UTC: in
 * a browser west of London, local time turned 1 March into "Feb 2023".
 * A date on 1 January is how a year-only date ("2019") is stored, so it
 * shows as just the year rather than an invented "Jan".
 */
export function formatMonthYear(date: Date | string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getUTCMonth() === 0 && d.getUTCDate() === 1) return String(d.getUTCFullYear());
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatDateRange(
  start: Date | null,
  end: Date | null,
  isCurrent?: boolean,
): string | null {
  const startLabel = formatMonthYear(start);
  const endLabel = isCurrent ? "Present" : formatMonthYear(end);
  if (startLabel && endLabel && startLabel === endLabel) return startLabel;
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
  // Indian postings quote "28-38 LPA" (lakh per annum), and parsers often
  // keep the bare 28 and 38. No senior role pays ₹28 an hour, so a rupee
  // figure under 200 is read as lakhs a year.
  const inLakhs = (val: number) => isInr && val > 0 && val < 200;
  const determineSuffix = (val: number) => {
    if (inLakhs(val)) return "/yr";
    if (isInr) return val < 1000 ? "/hr" : val < 200000 ? "/mo" : "/yr";
    if (val < 200) return "/hr";
    if (val < 10000) return "/mo";
    return "/yr";
  };
  const amount = (n: number) => {
    if (isInr) {
      if (inLakhs(n)) return `₹${n}L`;
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

/**
 * A job title as people should see it. Jobs analyzed from the form used to
 * be saved with the form's "Title:" label in front ("Title: Data Analyst").
 */
export function displayJobTitle(title: string | null | undefined): string {
  const t = (title ?? "").replace(/^\s*(job\s+)?title\s*:\s*/i, "").trim();
  return t || "Untitled role";
}

/**
 * A day as "7 Oct 2026": readable everywhere, unlike 10/7/2026, which an
 * Indian or British reader takes as 10 July. Fixed locale and UTC so the
 * server and the browser print the same thing.
 */
export function formatDay(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
