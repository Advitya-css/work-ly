"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { X, Send, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconAsk } from "@/components/icons";
import { cn } from "@/lib/utils";
import { askWorklyAction, type ChatReply } from "@/lib/chat/actions";
import { suggestionsForPath } from "@/lib/chat/knowledge";

interface Message {
  id: number;
  role: "user" | "workly";
  text: string;
  source?: ChatReply["source"];
}

/**
 * The help panel.
 *
 * Two decisions worth knowing about.
 *
 * It is page-aware. The suggested questions change with the route, because
 * someone who does not understand a screen should not also have to work out
 * what to ask about it. Standing on Opportunities offers "how is Priority
 * different from Fit"; standing on Career Path offers "what should I do
 * first".
 *
 * It labels where each answer came from. An answer drawn from Workly's own
 * documentation is exact and is marked as such. An answer from the language
 * model is marked too, so the reader knows to weigh it differently. Blurring
 * those two together would be the dishonest option.
 */
export function AskWorkly() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, startTransition] = useTransition();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  const suggestions = suggestionsForPath(pathname);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes the panel, which is what every other overlay here does.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function ask(question: string, knownId?: string) {
    const text = question.trim();
    if (!text || pending) return;

    setMessages((current) => [
      ...current,
      { id: nextId.current++, role: "user", text },
    ]);
    setInput("");

    startTransition(async () => {
      const reply = await askWorklyAction(text, pathname, knownId);
      setMessages((current) => [
        ...current,
        { id: nextId.current++, role: "workly", text: reply.answer, source: reply.source },
      ]);
    });
  }

  return (
    <>
      {/* ------------------------------------------------------ launcher */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="ask-workly-panel"
        className={cn(
          "fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full py-3 pr-5 pl-4 shadow-lg transition-all",
          "bg-primary text-primary-foreground hover:-translate-y-0.5 hover:shadow-xl",
          "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
          open && "opacity-0 pointer-events-none",
        )}
      >
        <IconAsk className="size-5" />
        <span className="text-sm font-medium">Ask Workly</span>
      </button>

      {/* --------------------------------------------------------- panel */}
      {open && (
        <div
          id="ask-workly-panel"
          role="dialog"
          aria-label="Ask Workly"
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl",
            // Full width on a phone, a panel on anything larger.
            "inset-x-3 bottom-3 top-16 sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-5 sm:h-[560px] sm:max-h-[calc(100dvh-3rem)] sm:w-[400px]",
          )}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border bg-[var(--area-career-tint)] px-4 py-3">
            <span className="flex items-center gap-2">
              <span
                className="area-chip size-8"
                style={
                  {
                    "--area-tint": "transparent",
                    "--area-color": "var(--area-career)",
                  } as React.CSSProperties
                }
              >
                <IconAsk className="size-4.5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">Ask Workly</span>
                <span className="block text-xs text-muted-foreground">
                  Your job search, explained
                </span>
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setOpen(false)}
              aria-label="Close Ask Workly"
            >
              <X className="size-4" />
            </Button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  I can explain what the numbers on this page mean, what to do next, and how
                  anything here works. Pick one, or type your own question.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {suggestions.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => ask(entry.question, entry.id)}
                      className="rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
                    >
                      {entry.question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex flex-col gap-1",
                      message.role === "user" ? "items-end" : "items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                        message.role === "user"
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted text-foreground",
                      )}
                    >
                      {message.text}
                    </div>
                    {message.role === "workly" && message.source && (
                      <span className="px-1 text-[11px] text-muted-foreground">
                        {message.source === "workly"
                          ? "From Workly's own documentation"
                          : message.source === "ai"
                            ? "Generated by AI, so check anything important"
                            : "Could not answer"}
                      </span>
                    )}
                  </div>
                ))}

                {pending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Thinking
                  </div>
                )}
              </div>
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t border-border px-3 py-3"
            onSubmit={(event) => {
              event.preventDefault();
              ask(input);
            }}
          >
            <label htmlFor="ask-workly-input" className="sr-only">
              Ask a question about your job search
            </label>
            <input
              id="ask-workly-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about a score, a gap, what to do next"
              className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
            />
            <Button type="submit" size="icon" className="size-9 shrink-0" disabled={pending || !input.trim()}>
              <Send className="size-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
