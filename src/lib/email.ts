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
      from: `Workly <noreply@${fromDomain}>`,
      to,
      subject: `${code} is your Workly verification code`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; color: #1c1a19; margin-bottom: 16px;">Welcome to Workly</h1>
          <p style="font-size: 16px; color: #6b6560; line-height: 1.5; margin-bottom: 24px;">
            Enter this code to verify your email address and finish creating your account.
          </p>
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1c1a19; background: #f5f3f1; border-radius: 8px; padding: 20px 24px; text-align: center; margin-bottom: 24px;">
            ${code}
          </div>
          <p style="font-size: 13px; color: #a89f99; margin-top: 32px; line-height: 1.4;">
            If you didn't create a Workly account, you can safely ignore this email.
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
      from: `Workly <noreply@${fromDomain}>`,
      to,
      subject: "Reset your Workly password",
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

/**
 * Sends a job alert email when new jobs are discovered.
 */
export async function sendJobAlertEmail(to: string, targetRole: string, newJobsCount: number, highPriorityCount: number): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const dashboardUrl = `${appUrl}/dashboard`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[workly:email] No RESEND_API_KEY set. Job alert for ${to} (${newJobsCount} new jobs)`);
    return;
  }

  const fromDomain = (process.env.RESEND_FROM_DOMAIN || "workly.app").replace(/^https?:\/\//, "").replace(/\/$/, "");

  let highlight = "";
  if (highPriorityCount > 0) {
    highlight = `<p style="font-size: 16px; color: #7a2e55; font-weight: bold; margin-bottom: 24px;">🔥 ${highPriorityCount} of these are a Strong Match based on your profile!</p>`;
  }

  const res = await fetchWithRetry("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Workly <noreply@${fromDomain}>`,
      to,
      subject: `${newJobsCount} New Jobs Found for ${targetRole}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; color: #1c1a19; margin-bottom: 16px;">New Job Matches Found!</h1>
          <p style="font-size: 16px; color: #6b6560; line-height: 1.5; margin-bottom: 16px;">
            Workly's discovery engine just found <strong>${newJobsCount} new jobs</strong> matching your target role of <em>${targetRole}</em>.
          </p>
          ${highlight}
          <a href="${dashboardUrl}" style="display: inline-block; background: #7a2e55; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            View Your Jobs
          </a>
          <p style="font-size: 13px; color: #a89f99; margin-top: 32px; line-height: 1.4;">
            You are receiving this because you set a Career Goal on Workly.
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
