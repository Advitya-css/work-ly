const fs = require('fs');
let code = fs.readFileSync('src/lib/email.ts', 'utf8');

// Replace standard assignment with a cleaned assignment
code = code.replace(
  /const fromDomain = process\.env\.RESEND_FROM_DOMAIN \|\| "workly\.app";/g,
  'const fromDomain = (process.env.RESEND_FROM_DOMAIN || "workly.app").replace(/^https?:\\/\\//, "").replace(/\\/$/, "");'
);

fs.writeFileSync('src/lib/email.ts', code);
