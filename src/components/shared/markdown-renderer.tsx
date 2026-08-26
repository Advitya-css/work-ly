import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h1 className="mt-6 mb-2 text-xl font-semibold tracking-tight" {...props} />,
          h2: ({ node, ...props }) => <h2 className="mt-5 mb-2 text-lg font-semibold tracking-tight" {...props} />,
          h3: ({ node, ...props }) => <h3 className="mt-4 mb-2 text-base font-semibold tracking-tight" {...props} />,
          h4: ({ node, ...props }) => <h4 className="mt-4 mb-2 text-sm font-semibold tracking-tight" {...props} />,
          p: ({ node, ...props }) => <p className="leading-relaxed mb-4 last:mb-0" {...props} />,
          ul: ({ node, ...props }) => <ul className="my-4 ml-6 list-disc [&>li]:mt-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="my-4 ml-6 list-decimal [&>li]:mt-2" {...props} />,
          li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
          a: ({ node, ...props }) => <a className="font-medium underline underline-offset-4 hover:opacity-80" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
          blockquote: ({ node, ...props }) => <blockquote className="mt-4 border-l-2 border-current/30 pl-4 italic opacity-90" {...props} />,
          code: ({ node, inline, ...props }: any) => 
            inline ? (
              <code className="relative rounded bg-current/10 px-[0.3rem] py-[0.2rem] font-mono text-[0.85em] font-medium" {...props} />
            ) : (
              <code className="relative block rounded bg-current/10 p-4 font-mono text-sm overflow-x-auto" {...props} />
            ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
