const fs = require('fs');
let code = fs.readFileSync('src/lib/ai/pathway-planner.ts', 'utf8');

code = code.replace(
  '${profile.profile.isFreelanceMode ? "CRITICAL CONTEXT:',
  '${profile.profile?.isFreelanceMode ? "CRITICAL CONTEXT:'
);

fs.writeFileSync('src/lib/ai/pathway-planner.ts', code);
