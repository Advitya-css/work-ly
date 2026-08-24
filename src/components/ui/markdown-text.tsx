import React from 'react';

export function MarkdownText({ content }: { content: string }) {
  // A tiny custom parser to handle bolding and basic markdown
  // Split by \n first
  const lines = content.split('\n');
  
  return (
    <div className="whitespace-pre-wrap space-y-2">
      {lines.map((line, i) => {
        // Handle bold **text**
        const parts = line.split(/(\*\*.*?\*\*)/g);
        
        return (
          <p key={i}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
              }
              // Handle single *text* for italics
              const italicParts = part.split(/(\*.*?\*)/g);
              return italicParts.map((ip, k) => {
                if (ip.startsWith('*') && ip.endsWith('*')) {
                  return <em key={k} className="italic text-foreground/80">{ip.slice(1, -1)}</em>;
                }
                // Handle ### headers
                if (ip.startsWith('### ')) {
                  return <span key={k} className="block mt-4 mb-2 text-lg font-semibold text-foreground">{ip.slice(4)}</span>;
                }
                if (ip.startsWith('## ')) {
                  return <span key={k} className="block mt-4 mb-2 text-xl font-semibold text-foreground">{ip.slice(3)}</span>;
                }
                // Handle # headers
                if (ip.startsWith('# ')) {
                  return <span key={k} className="block mt-4 mb-2 text-2xl font-bold text-foreground">{ip.slice(2)}</span>;
                }
                return ip;
              });
            })}
          </p>
        );
      })}
    </div>
  );
}
