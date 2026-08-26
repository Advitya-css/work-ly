const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

schema = schema.replace(
  '  updatedAt     DateTime @updatedAt',
  '  updatedAt     DateTime @updatedAt\n\n  isPro         Boolean  @default(false)\n  lastAlertSentAt DateTime?'
);

fs.writeFileSync('prisma/schema.prisma', schema);
