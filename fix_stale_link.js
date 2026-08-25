const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/stale-applications-card.tsx', 'utf8');

code = code.replace(
  `<Mail className="mr-1.5 size-3.5" />\n                    Draft email`,
  `<ArrowRight className="mr-1.5 size-3.5" />\n                    Review`
);

fs.writeFileSync('src/components/dashboard/stale-applications-card.tsx', code);
