"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { BUSINESS } from "@/lib/business";
import { createSeatCode } from "@/lib/payments/seat-codes";
import { randomGroupCode } from "@/lib/payments/seat-codes-core";
import { setSprintCapacity, setSprintStatus } from "@/lib/sprint";
import { sendOutreachEmail } from "@/lib/outreach";

/**
 * Admin-only actions for the /admin page: the same double check as the
 * page itself (the secret key AND the founder's account).
 */
async function requireAuthAdmin(formData: FormData): Promise<string> {
  const key = String(formData.get("key") ?? "");
  const user = await getCurrentUser();
  if (!process.env.ADMIN_SECRET || key !== process.env.ADMIN_SECRET || !user || user.email !== BUSINESS.supportEmail) {
    redirect("/");
  }
  return key;
}

const num = (v: FormDataEntryValue | null, min: number, max: number, fallback: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

/** A seat code made by hand: a free pass for a coach to try, a deal closed by email. */
export async function createSeatCodeAction(formData: FormData): Promise<void> {
  const key = await requireAuthAdmin(formData);
  const seats = num(formData.get("seats"), 1, 500, 1);
  const months = num(formData.get("months"), 1, 12, 3);
  const label = String(formData.get("label") ?? "manual").slice(0, 40);
  const group = await createSeatCode({ group: randomGroupCode("PASS"), seats, months, label });
  revalidatePath("/admin");
  redirect(`/admin?key=${encodeURIComponent(key)}&newcode=${encodeURIComponent(group.group)}#seat-codes`);
}

export async function setSprintCapacityAction(formData: FormData): Promise<void> {
  const key = await requireAuthAdmin(formData);
  await setSprintCapacity(num(formData.get("capacity"), 0, 20, 4));
  revalidatePath("/admin");
  redirect(`/admin?key=${encodeURIComponent(key)}#sprints`);
}

export async function markSprintDeliveredAction(formData: FormData): Promise<void> {
  const key = await requireAuthAdmin(formData);
  const sprintKey = String(formData.get("sprint") ?? "");
  if (sprintKey.startsWith("sprint:")) await setSprintStatus(sprintKey, "delivered");
  revalidatePath("/admin");
  redirect(`/admin?key=${encodeURIComponent(key)}#sprints`);
}

/** "Email someone" on the admin page: one personal email through Resend. */
export async function sendOutreachAction(
  _prev: { sent?: string; error?: string } | null,
  formData: FormData,
): Promise<{ sent?: string; error?: string }> {
  await requireAuthAdmin(formData);
  const to = String(formData.get("to") ?? "").trim();
  const result = await sendOutreachEmail({
    to,
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
    kind: formData.get("kind") === "cold" ? "cold" : "user",
    allowRepeatToday: formData.get("repeat") === "on",
  });
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin");
  return { sent: to };
}
