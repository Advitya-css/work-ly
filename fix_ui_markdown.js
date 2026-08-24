const fs = require('fs');

function patchFile(filepath) {
  let code = fs.readFileSync(filepath, 'utf8');
  
  // Add import
  if (!code.includes('MarkdownText')) {
    code = code.replace(
      'import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";',
      'import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";\nimport { MarkdownText } from "@/components/ui/markdown-text";'
    );
  }

  // Replace content div with MarkdownText
  if (filepath.includes('interview-prep-card')) {
    code = code.replace(
      '<div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed font-mono">{content}</div>',
      '<div className="text-sm text-foreground/90 leading-relaxed"><MarkdownText content={content} /></div>'
    );
  } else {
    code = code.replace(
      '<div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed font-mono">\n              {content}\n            </div>',
      '<div className="text-sm text-foreground/90 leading-relaxed">\n              <MarkdownText content={content} />\n            </div>'
    );
  }

  fs.writeFileSync(filepath, code);
}

patchFile('src/components/applications/interview-prep-card.tsx');
patchFile('src/components/applications/application-strategy-card.tsx');

