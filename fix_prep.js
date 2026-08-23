const fs = require('fs');
let code = fs.readFileSync('src/components/applications/interview-prep-card.tsx', 'utf8');
code = code.replace('<Card className="mt-8 border-primary/20 bg-primary/5">', '<Card className="border-primary/20 bg-primary/5">');
fs.writeFileSync('src/components/applications/interview-prep-card.tsx', code);
