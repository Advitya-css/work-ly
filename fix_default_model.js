const fs = require('fs');
let code = fs.readFileSync('src/lib/ai/providers/google-genai.ts', 'utf8');
code = code.replace(
  'const model = process.env.AI_MODEL ?? "gemini-1.5-flash";',
  'const model = process.env.AI_MODEL ?? "gemini-3.5-flash-lite";'
);
fs.writeFileSync('src/lib/ai/providers/google-genai.ts', code);
