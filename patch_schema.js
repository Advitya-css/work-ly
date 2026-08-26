const fs = require('fs');
let code = fs.readFileSync('prisma/schema.prisma', 'utf8');

const target = `  // Deprecated as of Phase 2 — superseded by the structured Skill model`;
const replacement = `  // --- Part-Time & Student Settings ---
  isPartTimeMode   Boolean  @default(false)
  availability     String?  // e.g. "Weekends", "Evenings", "Mon-Wed-Fri"

  // Deprecated as of Phase 2 — superseded by the structured Skill model`;

code = code.replace(target, replacement);
fs.writeFileSync('prisma/schema.prisma', code);
