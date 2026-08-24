const fs = require('fs');
let code = fs.readFileSync('src/lib/ai/providers/google-genai.ts', 'utf8');
code = code.replace(
  'if (model === "gemini-3.5-flash-lite") model = "gemini-1.5-flash";',
  'if (model === "gemini-3.5-flash-lite") model = "gemini-1.5-flash-8b";'
);
fs.writeFileSync('src/lib/ai/providers/google-genai.ts', code);
