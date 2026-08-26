const fs = require('fs');
let code = fs.readFileSync('src/components/pathway/pathway-step-card.tsx', 'utf8');

if (!code.includes('MarkdownRenderer')) {
  code = 'import { MarkdownRenderer } from "@/components/shared/markdown-renderer";\n' + code;
  
  code = code.replace(
    '<p className="text-sm text-muted-foreground">{step.description}</p>',
    '<div className="text-sm text-muted-foreground"><MarkdownRenderer content={step.description} /></div>'
  );
  
  fs.writeFileSync('src/components/pathway/pathway-step-card.tsx', code);
}
