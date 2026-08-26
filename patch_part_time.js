const fs = require('fs');
let code = fs.readFileSync('src/lib/settings/part-time-actions.ts', 'utf8');

code = code.replace(
  'UPDATE "career_profiles" SET "isPartTimeMode" = $1, "availability" = $2, "updatedAt" = now() WHERE "userId" = $3',
  'INSERT INTO "career_profiles" ("id", "userId", "isPartTimeMode", "availability", "updatedAt") VALUES (gen_random_uuid(), $3, $1, $2, now()) ON CONFLICT ("userId") DO UPDATE SET "isPartTimeMode" = $1, "availability" = $2, "updatedAt" = now()'
);

fs.writeFileSync('src/lib/settings/part-time-actions.ts', code);
