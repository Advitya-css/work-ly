const fs = require('fs');

function patchRoute(file) {
  let code = fs.readFileSync(file, 'utf8');

  // Add import if missing
  if (!code.includes('checkRateLimit')) {
    code = code.replace(
      'import { getFullCareerProfile } from "@/lib/career/get-full-profile";',
      'import { getFullCareerProfile } from "@/lib/career/get-full-profile";\nimport { checkRateLimit } from "@/lib/rate-limit";'
    );
  }

  // Add rate limit check
  if (!code.includes('checkRateLimit(')) {
    code = code.replace(
      'const user = await getCurrentUser();\n  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });',
      'const user = await getCurrentUser();\n  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });\n\n  const isAllowed = await checkRateLimit(`ai:app:${user.id}`, 20, 3600);\n  if (!isAllowed) {\n    return NextResponse.json({ error: "Too many AI requests. Please try again later." }, { status: 429 });\n  }'
    );
  }

  // Remove raw error leak
  if (code.includes('return NextResponse.json({ error: String(err) }, { status: 500 });')) {
    code = code.replace(
      'return NextResponse.json({ error: String(err) }, { status: 500 });',
      'console.error("AI route error:", err);\n    return NextResponse.json({ error: "Failed to generate AI response. Please try again later." }, { status: 500 });'
    );
  } else if (code.includes('return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });')) {
    code = code.replace(
      'return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });',
      'console.error("AI route error:", err);\n    return NextResponse.json({ error: "Failed to generate AI response. Please try again later." }, { status: 500 });'
    );
  } else if (code.includes('return NextResponse.json({ error: err }, { status: 500 });')) {
    code = code.replace(
      'return NextResponse.json({ error: err }, { status: 500 });',
      'console.error("AI route error:", err);\n    return NextResponse.json({ error: "Failed to generate AI response. Please try again later." }, { status: 500 });'
    );
  }

  fs.writeFileSync(file, code);
}

patchRoute('src/app/api/applications/[id]/interview-prep/route.ts');
patchRoute('src/app/api/applications/[id]/strategy/route.ts');
