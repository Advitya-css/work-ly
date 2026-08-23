const fs = require('fs');
let code = fs.readFileSync('src/components/applications/interview-prep-card.tsx', 'utf8');
code = code.replace(
  'if (!res.ok) throw new Error("Failed to generate prep.");',
  'if (!res.ok) { const errData = await res.json().catch(()=>({})); throw new Error(errData.error || "Failed to generate prep."); }'
);
fs.writeFileSync('src/components/applications/interview-prep-card.tsx', code);
