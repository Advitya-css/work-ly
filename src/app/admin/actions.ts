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

export interface CheckoutCheckRow {
  label: string;
  ok: boolean;
  note: string;
}

/**
 * "Why won't checkout open?" in one click: tries a real checkout for each
 * plan on the founder's own account (nothing is charged; an unpaid
 * checkout simply expires) and reports Polar's actual reason, plus the
 * payment settings this deployment can see.
 */
export async function checkoutCheckAction(_prev: CheckoutCheckRow[] | null, formData: FormData): Promise<CheckoutCheckRow[]> {
  await requireAuthAdmin(formData);
  const user = await getCurrentUser();
  if (!user) return [];
  const { POLAR_PRODUCT_IDS } = await import("@/lib/payments/polar-plans");
  const { openPolarCheckout } = await import("@/lib/payments/checkout");
  const { getFoundingOffer } = await import("@/lib/payments/founding");
  const rows: CheckoutCheckRow[] = [];

  const has = (k: string) => Boolean(process.env[k]?.trim());
  rows.push({ label: "POLAR_ACCESS_TOKEN", ok: has("POLAR_ACCESS_TOKEN"), note: has("POLAR_ACCESS_TOKEN") ? "set" : "missing: checkout can't work" });
  rows.push({ label: "POLAR_WEBHOOK_SECRET", ok: has("POLAR_WEBHOOK_SECRET"), note: has("POLAR_WEBHOOK_SECRET") ? "set" : "missing: payments won't unlock Pro until Restore purchase" });
  const founding = await getFoundingOffer().catch(() => null);
  rows.push({
    label: "Founding discount",
    ok: true,
    note: has("POLAR_FOUNDING_DISCOUNT_ID")
      ? founding
        ? `live: ${founding.percentOff}% off${founding.spotsLeft != null ? `, ${founding.spotsLeft} spots left` : ""}`
        : "POLAR_FOUNDING_DISCOUNT_ID is set but Polar doesn't return a live discount for it (wrong id, ended, used up, or the token can't read it). Checkout falls back to full price."
      : "not set (full prices)",
  });

  for (const plan of ["monthly", "quarterly", "yearly"] as const) {
    const outcome = await openPolarCheckout({
      productId: POLAR_PRODUCT_IDS[plan],
      email: user.email,
      userId: user.id,
      metadata: { user_id: user.id, diagnostic: "admin checkout check" },
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.work-ly.in"}/settings?checkout_id={CHECKOUT_ID}`,
      discountId: founding?.discountId ?? null,
    });
    rows.push(
      outcome.ok
        ? {
            label: `Checkout: ${plan}`,
            ok: true,
            note: outcome.dropped.length
              ? `opens, but only after dropping: ${outcome.dropped.join(", ")} (see the server log for Polar's reason)`
              : "opens",
          }
        : { label: `Checkout: ${plan}`, ok: false, note: outcome.advice.adminReason },
    );
  }
  return rows;
}
