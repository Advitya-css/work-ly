"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { updateLocationPreferences } from "@/lib/db/career-profile";

/**
 * Where you live, and everywhere else you would work.
 *
 * These used to live on a career goal, which meant a user with no goal set
 * had nowhere to record them at all, and someone with three goals had three
 * competing answers. They belong to the account.
 */

const schema = z.object({
  location: z.string().trim().max(120).optional().or(z.literal("")),
  preferredLocations: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
  openToRemote: z.coerce.boolean().optional(),
});

export interface LocationActionState {
  error?: string;
  success?: boolean;
}

export async function saveLocationPreferencesAction(
  _prev: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const raw = Object.fromEntries(formData) as Record<string, unknown>;
  // Repeated hidden inputs, so getAll rather than fromEntries, which would
  // keep only the last one.
  raw.preferredLocations = formData.getAll("preferredLocations");
  raw.openToRemote = formData.get("openToRemote") === "on" || formData.get("openToRemote") === "true";

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please check those locations and try again." };
  }

  await updateLocationPreferences(user.id, {
    location: parsed.data.location || null,
    preferredLocations: parsed.data.preferredLocations,
    openToRemote: parsed.data.openToRemote ?? true,
  });

  revalidatePath("/settings");
  revalidatePath("/opportunities");
  revalidatePath("/career-profile");
  return { success: true };
}
