import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useOptionalAuth } from "../../features/auth/AuthContext";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export type ThemePreset =
  | "aqua"
  | "teal"
  | "navy"
  | "emerald"
  | "blue"
  | "charcoal"
  | "amethyst"
  | "coral"
  | "amber"
  | "arctic";

export interface PresetInfo {
  id: ThemePreset;
  name: string;
  emoji: string;
  variableName: string;
}

export const THEME_PRESETS: PresetInfo[] = [
  { id: "aqua", name: "Aqua Water", emoji: "🌊", variableName: "--preset-aqua-primary" },
  { id: "teal", name: "Clinical Teal", emoji: "🌿", variableName: "--preset-teal-primary" },
  { id: "navy", name: "Midnight Navy", emoji: "🌌", variableName: "--preset-navy-primary" },
  { id: "emerald", name: "Emerald Healthcare", emoji: "🌲", variableName: "--preset-emerald-primary" },
  { id: "blue", name: "Royal Blue", emoji: "💎", variableName: "--preset-blue-primary" },
  { id: "charcoal", name: "Charcoal Minimalist", emoji: "🖤", variableName: "--preset-charcoal-primary" },
  { id: "amethyst", name: "Amethyst Violet", emoji: "🔮", variableName: "--preset-amethyst-primary" },
  { id: "coral", name: "Sunset Coral", emoji: "🌅", variableName: "--preset-coral-primary" },
  { id: "amber", name: "Amber Daylight", emoji: "⚡", variableName: "--preset-amber-primary" },
  { id: "arctic", name: "Arctic Glacier", emoji: "❄️", variableName: "--preset-arctic-primary" },
];

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
  preset: ThemePreset;
  setPreset: (preset: ThemePreset) => void;
  presets: PresetInfo[];
}

export const THEME_STORAGE_KEY = "mediconnect-theme";
export const PRESET_STORAGE_KEY = "mediconnect-preset";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined" || !window.localStorage) return "system";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // fallback if localStorage is blocked
  }
  return "system";
}

function getStoredPreset(): ThemePreset {
  if (typeof window === "undefined" || !window.localStorage) return "aqua";
  try {
    const stored = window.localStorage.getItem(PRESET_STORAGE_KEY) as ThemePreset | null;
    if (stored && THEME_PRESETS.some((p) => p.id === stored)) {
      return stored;
    }
  } catch {
    // fallback if localStorage is blocked
  }
  return "aqua";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const auth = useOptionalAuth();
  const isAuthenticated = Boolean(auth?.user);

  const [savedTheme, setSavedTheme] = useState<Theme>(getStoredTheme);
  const [savedPreset, setSavedPreset] = useState<ThemePreset>(getStoredPreset);
  const [systemResolved, setSystemResolved] = useState<ResolvedTheme>(getSystemTheme);

  // Sync state with localStorage when user transitions to authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setSavedTheme(getStoredTheme());
      setSavedPreset(getStoredPreset());
    }
  }, [isAuthenticated]);

  // Keep track of OS system theme changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemResolved(e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const setTheme = (next: Theme) => {
    setSavedTheme(next);
    // Only persist user customizations if authenticated; do not overwrite stored preferences while public
    if (isAuthenticated) {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignore
      }
    }
  };

  const setPreset = (next: ThemePreset) => {
    setSavedPreset(next);
    // Only persist user customizations if authenticated; do not overwrite stored preferences while public
    if (isAuthenticated) {
      try {
        window.localStorage.setItem(PRESET_STORAGE_KEY, next);
      } catch {
        // ignore
      }
    }
  };

  // Determine effective presentation:
  // Unauthenticated: fixed light mode & aqua preset
  // Authenticated: saved user mode & saved user preset
  const effectiveTheme: Theme = isAuthenticated ? savedTheme : "light";
  const effectivePreset: ThemePreset = isAuthenticated ? savedPreset : "aqua";
  const effectiveResolvedTheme: ResolvedTheme = isAuthenticated
    ? savedTheme === "system"
      ? systemResolved
      : savedTheme
    : "light";

  // Sync DOM attributes with effective presentation
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", effectiveResolvedTheme);
    root.style.colorScheme = effectiveResolvedTheme;
    root.setAttribute("data-preset", effectivePreset);
  }, [effectiveResolvedTheme, effectivePreset]);

  return (
    <ThemeContext.Provider
      value={{
        theme: effectiveTheme,
        setTheme,
        resolvedTheme: effectiveResolvedTheme,
        preset: effectivePreset,
        setPreset,
        presets: THEME_PRESETS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

const DEFAULT_VALUE: ThemeContextValue = {
  theme: "light",
  setTheme: () => {},
  resolvedTheme: "light",
  preset: "aqua",
  setPreset: () => {},
  presets: THEME_PRESETS,
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  return context ?? DEFAULT_VALUE;
}
