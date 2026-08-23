import "server-only";

/**
 * Sends a verification email using the Resend API.
 * Falls back to console.log in dev if RESEND_API_KEY is not set.
 */
export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[workly:email] No RESEND_API_KEY set. Verification link for ${to}:`);
    console.log(`  ${verifyUrl}`);
    return;
  }

  const fromDomain = process.env.RESEND_FROM_DOMAIN || "workly.app";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Workly <noreply@${fromDomain}>`,
      to,
      subject: "Verify your Workly email",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; color: #1c1a19; margin-bottom: 16px;">Welcome to Workly</h1>
          <p style="font-size: 16px; color: #6b6560; line-height: 1.5; margin-bottom: 24px;">
            Click the button below to verify your email address and get started.
          </p>
          <a href="${verifyUrl}" style="display: inline-block; background: #7a2e55; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            Verify email
          </a>
          <p style="font-size: 13px; color: #a89f99; margin-top: 32px; line-height: 1.4;">
            If you didn't create a Workly account, you can safely ignore this email.
            This link expires in 24 hours.
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

  const fromDomain = process.env.RESEND_FROM_DOMAIN || "workly.app";

  const res = await fetch("https://api.resend.com/emails", {
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

  const fromDomain = process.env.RESEND_FROM_DOMAIN || "workly.app";

  let highlight = "";
  if (highPriorityCount > 0) {
    highlight = `<p style="font-size: 16px; color: #7a2e55; font-weight: bold; margin-bottom: 24px;">🔥 ${highPriorityCount} of these are a Strong Match based on your profile!</p>`;
  }

  const res = await fetch("https://api.resend.com/emails", {
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
