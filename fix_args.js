const fs = require('fs');
let code = fs.readFileSync('src/app/api/applications/[id]/interview-prep/route.ts', 'utf8');
code = code.replace(
  'const app = await getApplicationWithJobById(params.id, user.id);',
  'const app = await getApplicationWithJobById(user.id, params.id);'
);
fs.writeFileSync('src/app/api/applications/[id]/interview-prep/route.ts', code);
