"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { updateUserProfile } from "@/lib/db/users";

export interface SettingsActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120),
});

export async function updateProfileAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { fieldErrors: { name: parsed.error.issues[0]?.message ?? "Invalid name" } };
  }

  await updateUserProfile(user.id, { name: parsed.data.name });
  revalidatePath("/settings");
  return { success: true };
}
