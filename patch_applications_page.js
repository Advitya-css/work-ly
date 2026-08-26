const fs = require('fs');

let code = fs.readFileSync('src/app/(app)/applications/page.tsx', 'utf8');

if (!code.includes('getCareerProfileByUserId')) {
  code = code.replace(
    'import { summarize } from "@/lib/applications/analytics";',
    'import { summarize } from "@/lib/applications/analytics";\nimport { getCareerProfileByUserId } from "@/lib/db/career-profile";'
  );
  
  code = code.replace(
    'const user = await getCurrentUser();',
    'const user = await getCurrentUser();\n  const profile = user ? await getCareerProfileByUserId(user.id) : null;'
  );
  
  code = code.replace(
    '<ApplicationsBoard applications={applications} />',
    '<ApplicationsBoard applications={applications} isFreelanceMode={profile?.isFreelanceMode ?? false} />'
  );
  
  fs.writeFileSync('src/app/(app)/applications/page.tsx', code);
}
