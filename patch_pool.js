const fs = require('fs');
let code = fs.readFileSync('src/lib/db/pool.ts', 'utf8');

code = code.replace(
  'max: 10,',
  'max: 3,'
);

fs.writeFileSync('src/lib/db/pool.ts', code);
