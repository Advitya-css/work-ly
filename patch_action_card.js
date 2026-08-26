const fs = require('fs');

let code = fs.readFileSync('src/components/pathway/action-card.tsx', 'utf8');

if (!code.includes('MarkdownRenderer')) {
  code = code.replace(
    'import { useState, useTransition } from "react";',
    'import { useState, useTransition } from "react";\nimport { MarkdownRenderer } from "@/components/shared/markdown-renderer";'
  );
  
  code = code.replace(
    '<p className="text-sm text-muted-foreground">{action.description}</p>',
    '<div className="text-sm text-muted-foreground"><MarkdownRenderer content={action.description} /></div>'
  );
  
  fs.writeFileSync('src/components/pathway/action-card.tsx', code);
}
