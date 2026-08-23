const fs = require('fs');
let code = fs.readFileSync('src/app/api/applications/[id]/interview-prep/route.ts', 'utf8');

code = code.replace(
  'export async function POST(req: Request, { params }: { params: { id: string } }) {',
  'export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {'
);
code = code.replace(
  'const app = await getApplicationWithJobById(params.id, user.id);',
  'const params = await context.params;\n  const app = await getApplicationWithJobById(params.id, user.id);'
);
code = code.replace(
  'let jobDetails = app.title;',
  'let jobDetails = app.job?.title ?? "a role";'
);
code = code.replace(
  'I am applying for the role of ${app.title} at ${app.company || \'a company\'}.',
  'I am applying for the role of ${app.job?.title ?? "a role"} at ${app.company || \'a company\'}.'
);

fs.writeFileSync('src/app/api/applications/[id]/interview-prep/route.ts', code);
