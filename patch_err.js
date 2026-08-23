const fs = require('fs');
let code = fs.readFileSync('src/app/api/applications/[id]/interview-prep/route.ts', 'utf8');
code = code.replace(
  'return NextResponse.json({ error: "Failed to generate interview prep." }, { status: 500 });',
  'return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to generate interview prep." }, { status: 500 });'
);
fs.writeFileSync('src/app/api/applications/[id]/interview-prep/route.ts', code);
