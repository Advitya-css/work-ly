const fs = require('fs');

function patchPrompt(filepath, toRemove, toAdd) {
  let code = fs.readFileSync(filepath, 'utf8');
  code = code.replace(toRemove, toAdd);
  fs.writeFileSync(filepath, code);
}

// Strategy Route
patchPrompt(
  'src/app/api/applications/[id]/strategy/route.ts',
  'Format as clean Markdown.',
  'Format as plain text. Do NOT use asterisks (*) for bolding or italics. Use standard dashes (-) for bullet points. Keep it clean and readable.'
);

// Interview Route
patchPrompt(
  'src/app/api/applications/[id]/interview-prep/route.ts',
  'Format as clean Markdown with bolding and bullet points.',
  'Format as plain text. Do NOT use asterisks (*) for bolding or italics. Use standard dashes (-) for bullet points. Keep it clean and readable.'
);

