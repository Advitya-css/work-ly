const fs = require('fs');
let code = fs.readFileSync('src/lib/discovery/actions.ts', 'utf8');

const target = `  const result = await submitParseAndAnalyzeJob(user.id, {
    inputMethod: "PASTED_TEXT",
    text: \`\${header}\\n\\n\${job.description}\`,
  });`;
const replacement = `  const result = await submitParseAndAnalyzeJob(user.id, {
    inputMethod: "PASTED_TEXT",
    text: \`\${header}\\n\\n\${job.description}\`,
    skipAuthenticityCheck: true,
  });`;
code = code.replace(target, replacement);

fs.writeFileSync('src/lib/discovery/actions.ts', code);
