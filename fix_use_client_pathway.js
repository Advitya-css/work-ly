const fs = require('fs');
const file = 'src/components/pathway/pathway-step-card.tsx';

let code = fs.readFileSync(file, 'utf8');
if (code.includes('"use client";')) {
  // Remove all instances of "use client";
  code = code.replace(/"use client";\n?/g, '');
  // Add it exactly once at the top
  code = '"use client";\n' + code;
}
fs.writeFileSync(file, code);
