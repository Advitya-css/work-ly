const fs = require('fs');

function revert(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');
  code = code.replace('import { MarkdownText } from "@/components/ui/markdown-text";\n', '');
  code = code.replace(
    '<div className="text-sm text-foreground/90 leading-relaxed"><MarkdownText content={content} /></div>',
    '<div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">{content}</div>'
  );
  code = code.replace(
    '<div className="text-sm text-foreground/90 leading-relaxed">\n              <MarkdownText content={content} />\n            </div>',
    '<div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">{content}</div>'
  );
  fs.writeFileSync(filepath, code);
}

revert('src/components/applications/interview-prep-card.tsx');
revert('src/components/applications/application-strategy-card.tsx');
