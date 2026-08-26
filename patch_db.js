const fs = require('fs');

// 1. prisma/schema.prisma
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
if (!schema.includes('isFreelanceMode')) {
  schema = schema.replace(
    'isPartTimeMode   Boolean  @default(false)',
    'isPartTimeMode   Boolean  @default(false)\n  isFreelanceMode  Boolean  @default(false)'
  );
  fs.writeFileSync('prisma/schema.prisma', schema);
}

// 2. src/lib/db/types.ts
let types = fs.readFileSync('src/lib/db/types.ts', 'utf8');
if (!types.includes('isFreelanceMode')) {
  types = types.replace(
    'isPartTimeMode: boolean;',
    'isPartTimeMode: boolean;\n  isFreelanceMode: boolean;'
  );
  fs.writeFileSync('src/lib/db/types.ts', types);
}

// 3. src/lib/db/career-profile.ts
let profile = fs.readFileSync('src/lib/db/career-profile.ts', 'utf8');
if (!profile.includes('isFreelanceMode')) {
  profile = profile.replace(
    'isPartTimeMode: Boolean(row.isPartTimeMode),',
    'isPartTimeMode: Boolean(row.isPartTimeMode),\n    isFreelanceMode: Boolean(row.isFreelanceMode),'
  );
  fs.writeFileSync('src/lib/db/career-profile.ts', profile);
}

