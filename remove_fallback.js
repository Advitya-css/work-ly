const fs = require('fs');
let code = fs.readFileSync('src/lib/ai/providers/google-genai.ts', 'utf8');
code = code.replace(
  'let model = process.env.AI_MODEL ?? "gemini-1.5-flash";\n    if (model === "gemini-3.5-flash-lite") model = "gemini-1.5-flash-8b";',
  'const model = process.env.AI_MODEL ?? "gemini-1.5-flash";'
);
fs.writeFileSync('src/lib/ai/providers/google-genai.ts', code);
