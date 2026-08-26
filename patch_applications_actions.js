const fs = require('fs');
let code = fs.readFileSync('src/lib/applications/actions.ts', 'utf8');

const target = `export async function setApplicationStatusAction(
  id: string,
  status: ApplicationStatus,
): Promise<void> {
  const application = await requireOwnedApplication(id);
  if (!application) return;
  await setApplicationStatus(id, status);
  revalidateApplicationViews(id);
}`;

const replacement = `import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { pool } from "@/lib/db/pool";
import { randomUUID } from "crypto";

export async function setApplicationStatusAction(
  id: string,
  status: ApplicationStatus,
): Promise<void> {
  const application = await requireOwnedApplication(id);
  if (!application) return;
  await setApplicationStatus(id, status);

  // Feature: Auto-add to resume when hired
  if (status === "OFFER") {
    try {
      const profile = await getCareerProfileByUserId(application.userId);
      if (profile && application.company) {
        // Prevent duplicates
        const { rows } = await pool.query(
          \`SELECT id FROM experiences WHERE "careerProfileId" = $1 AND company = $2 AND role = $3 LIMIT 1\`,
          [profile.id, application.company, application.roleTitle]
        );
        if (rows.length === 0) {
          await pool.query(
            \`INSERT INTO experiences (id, "careerProfileId", company, role, "startDate", "isCurrent", "updatedAt")
             VALUES ($1, $2, $3, $4, now(), true, now())\`,
            [randomUUID(), profile.id, application.company, application.roleTitle]
          );
        }
      }
    } catch (error) {
      console.error("Failed to auto-add experience on hire", error);
    }
  }

  revalidateApplicationViews(id);
}`;

// I need to make sure I don't import pool/crypto again if they are already imported.
// Let's do it safely by just adding the imports at the top if missing.

if (!code.includes('import { getCareerProfileByUserId }')) {
  code = code.replace('import { revalidatePath } from "next/cache";', 'import { revalidatePath } from "next/cache";\\nimport { getCareerProfileByUserId } from "@/lib/db/career-profile";\\nimport { pool } from "@/lib/db/pool";\\nimport { randomUUID } from "crypto";');
}
code = code.replace(target, replacement);

fs.writeFileSync('src/lib/applications/actions.ts', code);
