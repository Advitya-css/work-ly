import "server-only";

import { createSource, deleteSource, listSourcesByUserId } from "@/lib/db/discovery";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { listCareerGoalsByUserId } from "@/lib/db/career-goals";
import { getAdapter } from "@/lib/discovery/registry";
import { RETIRED_BOARDS, companyBoardsFor } from "@/lib/discovery/company-boards";

/**
 * Makes sure a user has the verified company career boards for their
 * country, and none of the retired ones. Shared by the Discover button and
 * the daily cron, so a user who never opens Discover still gets Indian
 * company boards in their daily email. Idempotent.
 */
export async function syncCompanyBoards(userId: string): Promise<void> {
  const [existing, profile, goals] = await Promise.all([
    listSourcesByUserId(userId),
    getCareerProfileByUserId(userId),
    listCareerGoalsByUserId(userId),
  ]);

  for (const retired of RETIRED_BOARDS) {
    for (const source of existing.filter(
      (s) => s.config?.boardToken === retired.boardToken && (s.config?.adapterId ?? "") === retired.adapterId,
    )) {
      await deleteSource(source.id);
    }
  }

  const places = [profile?.location, ...(profile?.preferredLocations ?? []), ...goals.flatMap((g) => g.countries ?? [])];
  for (const board of companyBoardsFor(places)) {
    if (existing.some((s) => s.config?.boardToken === board.boardToken && s.config?.adapterId === board.adapterId)) continue;
    const adapter = getAdapter(board.adapterId);
    if (!adapter) continue;
    await createSource(userId, {
      kind: adapter.kind,
      name: `${board.company} careers`,
      config: { adapterId: adapter.id, boardToken: board.boardToken, companyName: board.company },
      legalBasis: adapter.legalBasis,
    });
  }
}
