"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ThemeSettingsForm() {
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border p-3.5 text-sm font-medium transition-all cursor-pointer",
            !isDark
              ? "border-primary bg-accent text-accent-foreground font-semibold"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Sun className="size-4" />
          Light
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border p-3.5 text-sm font-medium transition-all cursor-pointer",
            isDark
              ? "border-primary bg-accent text-accent-foreground font-semibold"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Moon className="size-4" />
          Dark
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3.5">
        <div className="flex flex-col gap-0.5 min-w-0">
          <Label htmlFor="dark-mode-switch" className="text-sm font-medium text-foreground cursor-pointer">
            Dark mode
          </Label>
          <p className="text-sm text-muted-foreground">
            Use dark theme across Workly to reduce glare and eye strain.
          </p>
        </div>
        <Switch
          id="dark-mode-switch"
          checked={isDark}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        />
      </div>
    </div>
  );
}
