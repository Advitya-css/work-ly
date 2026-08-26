const fs = require('fs');
let code = fs.readFileSync('src/lib/applications/actions.ts', 'utf8');

// Remove the imports from the body of the file
code = code.replace(
  `import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { pool } from "@/lib/db/pool";
import { randomUUID } from "crypto";

export async function setApplicationStatusAction(`,
  `export async function setApplicationStatusAction(`
);

fs.writeFileSync('src/lib/applications/actions.ts', code);
