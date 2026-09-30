/**
 * ONE-TO-ONE EMAILS FROM THE FOUNDER - pure parts, so they can be tested.
 *
 * The admin page's "Email someone" box sends a single personal email
 * through Resend from advitya@work-ly.in: a note to someone who signed up,
 * or a first email to a coach or program. Written by hand (or drafted and
 * approved), sent one at a time - never a list blast.
 */

export type OutreachKind = "user" | "cold";

export const OUTREACH_DAILY_CAP = 60;

export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(value.trim());
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Plain text -> simple HTML: blank lines make paragraphs, line breaks stay, links become clickable. */
export function textToHtml(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((para) => {
      const html = escapeHtml(para.trim())
        .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1">$1</a>')
        .replace(/(?<![\/\w.@])((?:www\.)?work-ly\.in(?:\/[^\s<]*[^\s<.,;:!?)])?)/g, '<a href="https://$1">$1</a>')
        .replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 14px;">${html}</p>`;
    })
    .join("");
}

/** The footer every email carries: how to stop them, and (cold emails) who is writing and from where. */
export function outreachFooter(kind: OutreachKind, opts: { address: string; unsubscribeUrl?: string }): string {
  if (kind === "user") {
    return `You're getting this because you signed up for Work-ly.${opts.unsubscribeUrl ? ` Unsubscribe: ${opts.unsubscribeUrl}` : ""}`;
  }
  return `Advitya Bansal, Work-ly · ${opts.address}\nNot interested? Reply "no" and I won't write again.`;
}

/** A postal address a cold email can carry: at least a street number or PO box, not just a city. */
export function addressLooksComplete(address: string): boolean {
  return /\d/.test(address) && address.split(",").length >= 3;
}

/** rate_limits key logging one send: outreach:<day>:<email>. */
export function outreachKey(day: string, email: string): string {
  return `outreach:${day}:${email.trim().toLowerCase()}`;
}

export function parseOutreachKey(key: string): { day: string; email: string } | null {
  const m = /^outreach:(\d{4}-\d{2}-\d{2}):(.+)$/.exec(key);
  return m ? { day: m[1], email: m[2] } : null;
}
