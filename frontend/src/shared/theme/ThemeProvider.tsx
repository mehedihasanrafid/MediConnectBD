import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
}

const STORAGE_KEY = "mediconnect-theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined" || !window.localStorage) return "system";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // fallback if localStorage is blocked
  }
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const initial = getStoredTheme();
    return initial === "system" ? getSystemTheme() : initial;
  });

  const setTheme = (next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const computeResolved = (): ResolvedTheme => {
      if (theme === "system") return getSystemTheme();
      return theme;
    };

    const nextResolved = computeResolved();
    setResolvedTheme(nextResolved);

    const root = document.documentElement;
    root.setAttribute("data-theme", nextResolved);
    root.style.colorScheme = nextResolved;

    if (theme === "system" && typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        const updated = e.matches ? "dark" : "light";
        setResolvedTheme(updated);
        root.setAttribute("data-theme", updated);
        root.style.colorScheme = updated;
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

const DEFAULT_VALUE: ThemeContextValue = {
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "light",
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  return context ?? DEFAULT_VALUE;
}
