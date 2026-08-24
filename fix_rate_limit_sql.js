const fs = require('fs');

let code = fs.readFileSync('src/lib/rate-limit.ts', 'utf8');

code = code.replace(/\\$3/g, '$2');
code = code.replace(/\\[key, limit, expiresAt\\]/g, '[key, expiresAt]');

fs.writeFileSync('src/lib/rate-limit.ts', code);
