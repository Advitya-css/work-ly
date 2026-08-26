const fs = require('fs');

function patchError(file) {
  let code = fs.readFileSync(file, 'utf8');
  // Match any return NextResponse.json({ error: err... }, { status: 500 });
  code = code.replace(
    /return NextResponse\.json\(\{\s*error:[^}]+\},\s*\{\s*status:\s*500\s*\}\);/g,
    'console.error("AI route error:", err);\n    return NextResponse.json({ error: "Failed to generate AI response. Please try again later." }, { status: 500 });'
  );
  fs.writeFileSync(file, code);
}

patchError('src/app/api/applications/[id]/interview-prep/route.ts');
patchError('src/app/api/applications/[id]/strategy/route.ts');
