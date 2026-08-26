const fs = require('fs');

let code = fs.readFileSync('src/lib/settings/freelance-actions.ts', 'utf8');

code = code.replace(
  'UPDATE "career_profiles"\n      SET "isFreelanceMode" = $1, "updatedAt" = NOW()\n      WHERE "userId" = $2',
  'INSERT INTO "career_profiles" ("id", "userId", "isFreelanceMode", "updatedAt")\n      VALUES (gen_random_uuid(), $2, $1, NOW())\n      ON CONFLICT ("userId") DO UPDATE\n      SET "isFreelanceMode" = $1, "updatedAt" = NOW()'
);

fs.writeFileSync('src/lib/settings/freelance-actions.ts', code);
