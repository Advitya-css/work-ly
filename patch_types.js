const fs = require('fs');

let types = fs.readFileSync('src/lib/db/types.ts', 'utf8');
if (!types.includes('isFreelanceMode?: boolean')) {
  types = types.replace(
    'isPartTimeMode?: boolean;',
    'isPartTimeMode?: boolean;\n  isFreelanceMode?: boolean;'
  );
  fs.writeFileSync('src/lib/db/types.ts', types);
}
