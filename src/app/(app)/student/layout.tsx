import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";

/**
 * Student mode is a real mode, so its screens are not reachable without it.
 * Someone who has left student mode and then follows an old /student link
 * lands back on their normal home rather than on a page the rest of their
 * navigation no longer admits exists.
 */
export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getCareerProfileByUserId(user.id);
  if (!profile?.isStudent) redirect("/dashboard");

  return <>{children}</>;
}
