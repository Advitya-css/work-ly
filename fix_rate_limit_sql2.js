const fs = require('fs');
let code = fs.readFileSync('src/lib/rate-limit.ts', 'utf8');

code = code.replace(/VALUES \(\$1, 1, \$3\)/g, 'VALUES ($1, 1, $2)');
code = code.replace(/THEN \$3/g, 'THEN $2');
code = code.replace(/\[key, limit, expiresAt\]/g, '[key, expiresAt]');

fs.writeFileSync('src/lib/rate-limit.ts', code);
