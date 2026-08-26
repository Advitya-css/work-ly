const fs = require('fs');
let code = fs.readFileSync('src/lib/db/types.ts', 'utf8');

const target = `  openToRemote: boolean;
  createdAt: Date;
  updatedAt: Date;
}`;

const replacement = `  openToRemote: boolean;
  isPartTimeMode?: boolean;
  availability?: string | null;
  createdAt: Date;
  updatedAt: Date;
}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/db/types.ts', code);
