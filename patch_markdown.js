const fs = require('fs');

function replaceInFile(file, target, replacement, addImport) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes('MarkdownRenderer')) {
    code = addImport + '\n' + code;
  }
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
}

// 1. Application Strategy Card
replaceInFile(
  'src/components/applications/application-strategy-card.tsx',
  '<div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">{content}</div>',
  '<MarkdownRenderer content={content} />',
  'import { MarkdownRenderer } from "@/components/shared/markdown-renderer";'
);

// 2. Interview Prep Card
replaceInFile(
  'src/components/applications/interview-prep-card.tsx',
  '<div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">{content}</div>',
  '<MarkdownRenderer content={content} />',
  'import { MarkdownRenderer } from "@/components/shared/markdown-renderer";'
);

