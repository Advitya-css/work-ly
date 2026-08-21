"use client";

import { useTheme, type Theme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const THEMES: { id: Theme; name: string; bg: string; primary: string; isDark: boolean }[] = [
  { id: "light", name: "Light", bg: "#fffdfb", primary: "#7a2e55", isDark: false },
  { id: "dark", name: "Dark", bg: "#161413", primary: "#e39ac0", isDark: true },
  { id: "midnight", name: "Midnight", bg: "#0f0b1e", primary: "#a78bfa", isDark: true },
  { id: "lavender", name: "Lavender", bg: "#f5f0ff", primary: "#6d3fa0", isDark: false },
  { id: "rose", name: "Rose", bg: "#fff5f7", primary: "#c2185b", isDark: false },
  { id: "sunset", name: "Sunset", bg: "#1a1014", primary: "#9333ea", isDark: true },
];

export function ThemeSettingsForm() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-3.5 text-sm font-medium transition-all cursor-pointer",
              theme === t.id
                ? "border-primary bg-accent text-accent-foreground font-semibold ring-1 ring-primary"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <div className="flex gap-1">
              <div
                className="size-5 rounded-full border border-border/50"
                style={{ backgroundColor: t.bg }}
              />
              <div
                className="size-5 rounded-full border border-border/50"
                style={{ backgroundColor: t.primary }}
              />
            </div>
            <span className="text-xs">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
