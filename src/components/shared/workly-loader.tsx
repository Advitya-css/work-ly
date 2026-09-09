import Image from "next/image";
import { cn } from "@/lib/utils";

export function WorklyLoader({ className }: { className?: string }) {
  const hasSize = className?.includes("size-") || className?.includes("w-") || className?.includes("h-");
  
  return (
    <div className={cn("relative", !hasSize && "w-4 h-4", className)}>
      <div className="absolute inset-0 animate-spin">
        <Image src="/workly-bot.png" alt="Loading..." fill sizes="32px" className="object-contain" />
      </div>
    </div>
  );
}
