const fs = require('fs');
let code = fs.readFileSync('src/lib/applications/actions.ts', 'utf8');

code = code.replace(
  'import { revalidatePath } from "next/cache";\\nimport { getCareerProfileByUserId } from "@/lib/db/career-profile";\\nimport { pool } from "@/lib/db/pool";\\nimport { randomUUID } from "crypto";',
  `import { revalidatePath } from "next/cache";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { pool } from "@/lib/db/pool";
import { randomUUID } from "crypto";`
);

fs.writeFileSync('src/lib/applications/actions.ts', code);
