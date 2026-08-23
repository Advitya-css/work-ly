const fs = require('fs');
let code = fs.readFileSync('src/components/applications/interview-prep-card.tsx', 'utf8');
code = code.replace('import { MarkdownProse } from "@/components/ui/markdown-prose";', '');
code = code.replace('<MarkdownProse content={content} />', '<div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed font-mono">{content}</div>');
fs.writeFileSync('src/components/applications/interview-prep-card.tsx', code);
