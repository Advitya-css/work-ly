import "server-only";

import { getUserById } from "@/lib/db/users";
import { fitQualityFor, type AIQuality } from "@/lib/ai/quality-core";

/** The model quality for this user's Fit check: stronger for active Pro, standard otherwise. */
export async function fitQualityForUser(userId: string): Promise<AIQuality> {
  try {
    return fitQualityFor(await getUserById(userId));
  } catch {
    return "standard";
  }
}
