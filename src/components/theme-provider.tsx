"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "midnight" | "lavender" | "rose" | "sunset";

const DARK_THEMES: Theme[] = ["dark", "midnight", "sunset"];
const THEME_CLASSES: Record<Theme, string[]> = {
  light: [],
  dark: ["dark"],
  midnight: ["dark", "theme-midnight"],
  lavender: ["theme-lavender"],
  rose: ["theme-rose"],
  sunset: ["dark", "theme-sunset"],
};

const ALL_CLASSES = ["dark", "theme-midnight", "theme-lavender", "theme-rose", "theme-sunset"];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored && stored in THEME_CLASSES) {
      setThemeState(stored);
      applyThemeClasses(stored);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setThemeState("dark");
      applyThemeClasses("dark");
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    applyThemeClasses(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyThemeClasses(theme: Theme) {
  const el = document.documentElement;
  el.classList.remove(...ALL_CLASSES);
  const classes = THEME_CLASSES[theme];
  if (classes.length > 0) {
    el.classList.add(...classes);
  }
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
