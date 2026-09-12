"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  ThemeId,
  ThemeConfig,
  THEMES,
  THEMES_LIST,
  DEFAULT_THEME_ID,
} from "@/lib/themes/theme-config";

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  currentThemeConfig: ThemeConfig;
  themes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "thinkit_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
        if (saved && saved in THEMES) return saved;
      } catch {
        // Ignore localStorage error
      }
    }
    return DEFAULT_THEME_ID;
  });

  // Synchronize document attribute whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeId) => {
    if (!(newTheme in THEMES)) return;
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    } catch {
      // Ignore localStorage errors
    }
  };

  const currentThemeConfig = THEMES[theme] || THEMES[DEFAULT_THEME_ID];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        currentThemeConfig,
        themes: THEMES_LIST,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
