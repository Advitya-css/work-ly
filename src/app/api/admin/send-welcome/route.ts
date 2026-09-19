import { NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";

export async function GET(req: Request) {
  // Security check
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== "launch123") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromDomain = process.env.RESEND_FROM_DOMAIN || "workly.app";
  const testEmail = searchParams.get("testEmail");
  
  if (!apiKey) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }

  // 🔴 1. ADD THE EMAILS YOU WANT TO EXCLUDE HERE (used during the real send):
  const excludedEmails = [
    "advitya@yourdomain.com", 
    "testaccount@gmail.com",
    "another-test@hotmail.com"
  ];

  try {
    let users = [];

    // If you pass ?testEmail=..., send ONLY to that email. Otherwise, fetch from DB.
    if (testEmail) {
      console.log(`--- RUNNING IN TEST MODE FOR: ${testEmail} ---`);
      users = [{ email: testEmail, id: "test-id" }];
    } else {
      console.log(`--- RUNNING IN PRODUCTION MODE ---`);
      const { rows } = await pool.query(`
        SELECT email, id FROM users 
        WHERE email IS NOT NULL 
        ORDER BY "createdAt" ASC 
        LIMIT 60
      `);
      users = rows;
    }

    let sentCount = 0;

    for (const user of users) {
      // 🔴 2. SKIP EXCLUDED EMAILS (Only applies during the real send)
      if (!testEmail && excludedEmails.includes(user.email)) {
        console.log(`Skipping excluded email: ${user.email}`);
        continue;
      }

      // Stop once we actually send 50 emails
      if (sentCount >= 50) break;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Advitya from Work-ly <advitya@${fromDomain}>`,
          to: user.email,
          subject: "Thank you for being one of our first 50 users!",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 30px 20px; color: #1c1a19; line-height: 1.6;">
              <p>Hey there,</p>
              <p>I’m the solo developer behind Work-ly, and I’m reaching out because you are officially one of the first 50 people to ever join the platform.</p>
              <p>When I started building Work-ly, my goal wasn't just to make another generic job board. I wanted to build an AI that actually understands <em>you</em>—whether you're trying to pivot into a totally new industry, relocating and trying to figure out local job titles, or just looking for hidden roles that actually match your unique skills.</p>
              <p>Seeing real people use the Smart Matching and the 30-Day Action Plans over these first few weeks has been incredible.</p>
              <p>Because you’re one of my earliest users, your opinion matters more to me than anyone else's. I am actively coding the next version of the app, and I want to build exactly what you need.</p>
              <p><strong>Could you take 2 minutes to fill out this quick feedback form?</strong></p>
              <p><a href="YOUR_FORM_LINK_HERE" style="display: inline-block; background: #7a2e55; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Give Feedback</a></p>
              <p><strong>As a huge thank you, I’m giving a free month of Work-ly Pro to everyone who completes it.</strong> (Just leave your account email at the end of the form and I'll upgrade you).</p>
              <p>Please be brutally honest. Tell me what features you love, what feels confusing, and what you want me to build next.</p>
              <p>Thank you so much for being here early.</p>
              <p>Warmly,<br>Advitya<br>Founder, Work-ly</p>
            </div>
          `,
        }),
      });

      if (res.ok) {
        sentCount++;
        console.log(`Sent to ${user.email}`);
      } else {
        const err = await res.text();
        console.error(`Failed to send to ${user.email}:`, err);
      }
      
      // Brief pause to avoid hitting Resend rate limits
      await new Promise(r => setTimeout(r, 200)); 
    }

    return NextResponse.json({ success: true, totalSent: sentCount, mode: testEmail ? "test" : "production" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
