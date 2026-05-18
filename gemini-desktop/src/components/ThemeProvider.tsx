"use client";

import React from "react";

export type Theme = "dark" | "light" | "system";
const STORAGE_KEY = "gemini-desktop-theme";

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(resolved);
  root.setAttribute("data-theme", resolved);
}

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "dark" | "light" | undefined;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: undefined,
  setTheme: () => {},
});

export function useTheme() {
  return React.useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = React.useState<"dark" | "light" | undefined>(undefined);

  React.useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) || "system";
    const resolved = stored === "system" ? getSystemTheme() : stored;
    setThemeState(stored);
    setResolvedTheme(resolved);
    applyTheme(stored);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      setThemeState((current) => {
        if (current === "system") {
          const newResolved = getSystemTheme();
          setResolvedTheme(newResolved);
          applyTheme("system");
        }
        return current;
      });
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const setTheme = React.useCallback((newTheme: Theme) => {
    const resolved = newTheme === "system" ? getSystemTheme() : newTheme;
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
    setThemeState(newTheme);
    setResolvedTheme(resolved);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
