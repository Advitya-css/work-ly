const fs = require('fs');
let code = fs.readFileSync('src/lib/db/career-profile.ts', 'utf8');

const target = `    openToRemote: row.openToRemote == null ? true : Boolean(row.openToRemote),
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}`;

const replacement = `    openToRemote: row.openToRemote == null ? true : Boolean(row.openToRemote),
    isPartTimeMode: Boolean(row.isPartTimeMode),
    availability: (row.availability as string | null) ?? null,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/db/career-profile.ts', code);
