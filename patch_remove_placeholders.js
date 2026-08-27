const fs = require('fs');
let code = fs.readFileSync('src/lib/pathway/plan-90-days.ts', 'utf8');

// The generic filler actions are placed when the window is empty:
// if (!actions.some((a) => a.window === "DAYS_0_30")) { ... }
// I will just remove these blocks completely.

code = code.replace(/if \(!actions\.some\(\(a\) => a\.window === "DAYS_0_30"\)\) \{[\s\S]*?\}\n/, '');
code = code.replace(/if \(!actions\.some\(\(a\) => a\.window === "DAYS_31_60"\)\) \{[\s\S]*?\}\n/, '');
code = code.replace(/if \(!actions\.some\(\(a\) => a\.window === "DAYS_61_90"\)\) \{[\s\S]*?\}\n/, '');

fs.writeFileSync('src/lib/pathway/plan-90-days.ts', code);
