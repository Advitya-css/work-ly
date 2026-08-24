const fs = require('fs');
let code = fs.readFileSync('src/app/api/cron/job-alerts/route.ts', 'utf8');

// Replace the weak check with a strict check
code = code.replace(
  '// Only enforce CRON_SECRET if it\\'s set (allows easy local testing)\n  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {\n    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });\n  }',
  '// Enforce CRON_SECRET strictly in production\n  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${cronSecret}`) {\n    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });\n  }\n  // Allow missing secret in local dev, but still enforce if provided\n  if (process.env.NODE_ENV !== "production" && cronSecret && authHeader !== `Bearer ${cronSecret}`) {\n    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });\n  }'
);

fs.writeFileSync('src/app/api/cron/job-alerts/route.ts', code);
