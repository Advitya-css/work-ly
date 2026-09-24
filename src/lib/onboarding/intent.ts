/** What brought someone to Work-ly - asked once, on the welcome screen. */
export type OnboardingIntent = "hunt" | "switch" | "freelance";

export function parseOnboardingIntent(raw: string | undefined | null): OnboardingIntent {
  return raw === "switch" || raw === "freelance" ? raw : "hunt";
}
