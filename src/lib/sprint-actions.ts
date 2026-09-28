"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/pool";
import { notifyFounder } from "@/lib/email";
import { setSprintStatus, sprintForUser } from "@/lib/sprint";
import { postingLinks } from "@/lib/sprint-core";

const clip = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * The Sprint intake form. Saved as a feedback row (type SPRINT_INTAKE) so
 * it lives with the account and goes when the account is deleted, and sent
 * to the founder's inbox so the 14 days can start.
 */
export async function submitSprintIntakeAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/sprint-intake");
  const sprint = await sprintForUser(user.id);
  if (!sprint) redirect("/sprint");

  const roles = clip(formData.get("roles"), 300);
  const postingsText = clip(formData.get("postings"), 3000);
  const situation = clip(formData.get("situation"), 300);
  const notes = clip(formData.get("notes"), 2000);
  const callTimes = clip(formData.get("call_times"), 300);
  if (!roles) redirect("/sprint-intake?error=roles");

  const links = postingLinks(postingsText);
  const message = [
    `Roles: ${roles}`,
    `Postings (${links.length}): ${links.length ? links.join(" ") : "none yet - pick from their matches"}`,
    `Situation / deadline: ${situation || "-"}`,
    `Good times for the day-7 call: ${callTimes || "-"}`,
    `Anything else: ${notes || "-"}`,
  ].join("\n");

  await pool.query(
    `INSERT INTO feedbacks (id, "userId", type, message, url, "createdAt") VALUES (gen_random_uuid()::text, $1, 'SPRINT_INTAKE', $2, '/sprint-intake', now())`,
    [user.id, message],
  );
  await setSprintStatus(sprint.key, "intake");
  await notifyFounder(`Sprint intake from ${user.email}`, [
    `${user.name ?? user.email} sent their Sprint intake. The 14 days start now: resume review due within one business day.`,
    "",
    message,
  ]).catch(() => false);

  redirect("/sprint-intake?sent=1");
}
