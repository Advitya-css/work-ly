import "server-only";

async function fetchWithRetry(url: string, options: RequestInit, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err: any) {
      if (i === retries) throw err;
      if (err.code !== 'UND_ERR_SOCKET' && err.message !== 'fetch failed') throw err;
      await new Promise(r => setTimeout(r, 500 * (i + 1))); // Exponential backoff
    }
  }
  throw new Error("Unreachable");
}

/**
 * Sends a 6-digit email verification code using the Resend API.
 * Falls back to console.log in dev if RESEND_API_KEY is not set.
 */
export async function sendVerificationCodeEmail(to: string, code: string): Promise<void> {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    console.log(`[workly:email] No RESEND_API_KEY set. Verification code for ${to}: ${code}`);
    return;
  }

  const fromDomain = (process.env.RESEND_FROM_DOMAIN || "workly.app").replace(/^https?:\/\//, "").replace(/\/$/, "");

  const res = await fetchWithRetry("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Work-ly <noreply@${fromDomain}>`,
      to,
      subject: `${code} is your Work-ly verification code`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; color: #1c1a19; margin-bottom: 16px;">Welcome to Work-ly</h1>
          <p style="font-size: 16px; color: #6b6560; line-height: 1.5; margin-bottom: 24px;">
            Enter this code to verify your email address and finish creating your account.
          </p>
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1c1a19; background: #f5f3f1; border-radius: 8px; padding: 20px 24px; text-align: center; margin-bottom: 24px;">
            ${code}
          </div>
          <p style="font-size: 13px; color: #a89f99; margin-top: 32px; line-height: 1.4;">
            If you didn't create a Work-ly account, you can safely ignore this email.
            This code expires in 10 minutes.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[workly:email] Resend API error (${res.status}):`, body);
  }
}

/**
 * Sends a password reset email using the Resend API.
 */
export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[workly:email] No RESEND_API_KEY set. Password reset link for ${to}:`);
    console.log(`  ${resetUrl}`);
    return;
  }

  const fromDomain = (process.env.RESEND_FROM_DOMAIN || "workly.app").replace(/^https?:\/\//, "").replace(/\/$/, "");

  const res = await fetchWithRetry("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Work-ly <noreply@${fromDomain}>`,
      to,
      subject: "Reset your Work-ly password",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; color: #1c1a19; margin-bottom: 16px;">Password Reset Request</h1>
          <p style="font-size: 16px; color: #6b6560; line-height: 1.5; margin-bottom: 24px;">
            We received a request to reset your password. Click the button below to set a new one.
          </p>
          <a href="${resetUrl}" style="display: inline-block; background: #7a2e55; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            Reset password
          </a>
          <p style="font-size: 13px; color: #a89f99; margin-top: 32px; line-height: 1.4;">
            If you didn't request this, you can safely ignore this email. Your password won't change.
            This link expires in 1 hour.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[workly:email] Resend API error (${res.status}):`, body);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export interface AlertMatch {
  title: string;
  company: string | null;
  fitScore: number | null;
  reason: string | null;
}

/**
 * Sends a job alert email when new jobs are discovered. When strong matches
 * are passed, the email names them (title, company, fit, the one-line
 * reason) so it's worth opening - a bare "N new jobs" count isn't.
 */
export async function sendJobAlertEmail(
  to: string,
  targetRole: string,
  newJobsCount: number,
  highPriorityCount: number,
  matches: AlertMatch[] = [],
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const discoverUrl = `${appUrl}/discover`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[workly:email] No RESEND_API_KEY set. Job alert for ${to} (${newJobsCount} new jobs)`);
    return;
  }

  const fromDomain = (process.env.RESEND_FROM_DOMAIN || "workly.app").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const role = escapeHtml(targetRole);

  const matchRows = matches
    .slice(0, 3)
    .map(
      (m) => `
        <tr><td style="padding: 12px 0; border-bottom: 1px solid #eee;">
          <div style="font-size: 15px; font-weight: 600; color: #1c1a19;">${escapeHtml(m.title)}${m.company ? ` <span style="font-weight: 400; color: #6b6560;">at ${escapeHtml(m.company)}</span>` : ""}</div>
          ${m.fitScore != null ? `<div style="font-size: 13px; color: #7a2e55; margin-top: 2px;">Candidate Fit ${m.fitScore}/100</div>` : ""}
          ${m.reason ? `<div style="font-size: 13px; color: #6b6560; margin-top: 4px; line-height: 1.4;">${escapeHtml(m.reason.slice(0, 180))}</div>` : ""}
        </td></tr>`,
    )
    .join("");

  const subject =
    highPriorityCount > 0
      ? `${highPriorityCount} strong ${targetRole} match${highPriorityCount === 1 ? "" : "es"} posted recently`
      : `${newJobsCount} new ${targetRole} job${newJobsCount === 1 ? "" : "s"} found`;

  const res = await fetchWithRetry("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Work-ly <noreply@${fromDomain}>`,
      to,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 22px; color: #1c1a19; margin-bottom: 12px;">${highPriorityCount > 0 ? "New roles worth applying to" : "New roles found for you"}</h1>
          <p style="font-size: 15px; color: #6b6560; line-height: 1.5; margin-bottom: 8px;">
            Work-ly found <strong>${newJobsCount} new ${newJobsCount === 1 ? "job" : "jobs"}</strong> for <em>${role}</em>${
              highPriorityCount > 0 ? `, and <strong>${highPriorityCount}</strong> ${highPriorityCount === 1 ? "is a strong match" : "are strong matches"} for your profile` : ""
            }.
          </p>
          ${matchRows ? `<table style="width: 100%; border-collapse: collapse; margin: 8px 0 24px;">${matchRows}</table>` : ""}
          <a href="${discoverUrl}" style="display: inline-block; background: #7a2e55; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            See your matches
          </a>
          <p style="font-size: 12px; color: #a89f99; margin-top: 32px; line-height: 1.4;">
            Early applicants get read first. You're receiving this because you set a career goal on Work-ly.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[workly:email] Resend API error (${res.status}):`, body);
  }
}

/**
 * The always-on job watch email (yearly perk): sent only when a daily
 * search turns up something at or above the member's Fit bar, so it stays
 * rare enough to be worth opening even when they're happily employed.
 */
export async function sendJobWatchEmail(to: string, matches: AlertMatch[], minFit: number): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[workly:email] No RESEND_API_KEY set. Job watch for ${to} (${matches.length} matches)`);
    return;
  }
  const fromDomain = (process.env.RESEND_FROM_DOMAIN || "workly.app").replace(/^https?:\/\//, "").replace(/\/$/, "");

  const rows = matches
    .slice(0, 3)
    .map(
      (m) => `
        <tr><td style="padding: 12px 0; border-bottom: 1px solid #eee;">
          <div style="font-size: 15px; font-weight: 600; color: #1c1a19;">${escapeHtml(m.title)}${m.company ? ` <span style="font-weight: 400; color: #6b6560;">at ${escapeHtml(m.company)}</span>` : ""}</div>
          ${m.fitScore != null ? `<div style="font-size: 13px; color: #7a2e55; margin-top: 2px;">Candidate Fit is ${m.fitScore}/100</div>` : ""}
          ${m.reason ? `<div style="font-size: 13px; color: #6b6560; margin-top: 4px; line-height: 1.4;">${escapeHtml(m.reason.slice(0, 200))}</div>` : ""}
        </td></tr>`,
    )
    .join("");

  const first = matches[0];
  const subject =
    matches.length === 1 && first
      ? `Worth a look: ${first.title}${first.company ? ` at ${first.company}` : ""}`
      : `${matches.length} exceptional matches worth a look`;

  const res = await fetchWithRetry("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `Work-ly <noreply@${fromDomain}>`,
      to,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 22px; color: #1c1a19; margin-bottom: 12px;">Your job watch found something</h1>
          <p style="font-size: 15px; color: #6b6560; line-height: 1.5; margin-bottom: 8px;">
            Work-ly searches for you every day and only writes when a role clears your bar of Candidate Fit ${minFit}+. This one did.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 8px 0 24px;">${rows}</table>
          <a href="${appUrl}/discover" style="display: inline-block; background: #7a2e55; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            Open it in Work-ly
          </a>
          <p style="font-size: 12px; color: #a89f99; margin-top: 32px; line-height: 1.4;">
            You're receiving this because always-on job watch is switched on. Turn it off or change your bar under Insights in Work-ly.
          </p>
        </div>
      `,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[workly:email] Resend API error (${res.status}):`, body);
  }
}
