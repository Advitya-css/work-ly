const fs = require('fs');

function patchFile(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');
  code = code.replace(/if \(!checkRateLimit/g, 'if (!(await checkRateLimit)');
  fs.writeFileSync(filepath, code);
}

patchFile('src/lib/auth/actions.ts');
patchFile('src/lib/chat/actions.ts');
patchFile('src/app/api/applications/[id]/interview-prep/route.ts');
patchFile('src/app/api/applications/[id]/strategy/route.ts');
