const fs = require('fs');

let file = 'src/components/chat/ask-workly.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('MarkdownRenderer')) {
  code = 'import { MarkdownRenderer } from "@/components/shared/markdown-renderer";\n' + code;
}

const target = `<div
                      className={cn(
                        "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                        message.role === "user"
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted text-foreground",
                      )}
                    >
                      {message.text}
                    </div>`;

const replacement = `<div
                      className={cn(
                        "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm",
                        message.role === "user"
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted text-foreground",
                      )}
                    >
                      <MarkdownRenderer content={message.text} />
                    </div>`;

code = code.replace(target, replacement);
fs.writeFileSync(file, code);
