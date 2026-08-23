const fs = require('fs');
let code = fs.readFileSync('src/lib/pathway/generate.ts', 'utf8');
code = code.replace(/  import { enhancePathwayWithActionablePlans } from "@\/lib\/ai\/pathway-planner";\n\n  let input/, '  let input');
code = code.replace('import { buildPathway } from "@/lib/pathway/build-pathway";', 'import { buildPathway } from "@/lib/pathway/build-pathway";\nimport { enhancePathwayWithActionablePlans } from "@/lib/ai/pathway-planner";');
fs.writeFileSync('src/lib/pathway/generate.ts', code);
