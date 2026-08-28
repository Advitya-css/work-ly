const fs = require('fs');
let code = fs.readFileSync('src/lib/discovery/run.ts', 'utf8');

// I will just use sed to replace the analyzeFit section
