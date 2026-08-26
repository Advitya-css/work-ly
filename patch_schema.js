const fs = require('fs');
let code = fs.readFileSync('prisma/schema.prisma', 'utf8');

code = code.replace(
  '  @@map("career_goals")',
  '  @@index([userId])\n  @@map("career_goals")'
);

fs.writeFileSync('prisma/schema.prisma', code);
