"use client";

import { useEffect, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";

export function ScrambleText({ text, active = true }: { text: string; active?: boolean }) {
  const [displayText, setDisplayText] = useState(active ? "" : text);

  useEffect(() => {
    if (!active) {
      setDisplayText(text);
      return;
    }

    let iterations = 0;
    const maxIterations = 20;
    
    const interval = setInterval(() => {
      setDisplayText((prev) => 
        text.split("").map((char, index) => {
          if (char === " ") return " ";
          if (index < (iterations / maxIterations) * text.length) {
            return text[index];
          }
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        }).join("")
      );

      iterations++;
      if (iterations >= maxIterations) {
        clearInterval(interval);
        setDisplayText(text);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [text, active]);

  return <span className={active ? "animate-pulse" : ""}>{displayText}</span>;
}
