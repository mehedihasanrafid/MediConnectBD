import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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

const THEME_STORAGE_KEY = "mediconnect-theme";
const PRESET_STORAGE_KEY = "mediconnect-preset";

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
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [preset, setPresetState] = useState<ThemePreset>(getStoredPreset);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const initial = getStoredTheme();
    return initial === "system" ? getSystemTheme() : initial;
  });

  const setTheme = (next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const setPreset = (next: ThemePreset) => {
    setPresetState(next);
    try {
      window.localStorage.setItem(PRESET_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  // Sync mode (light / dark)
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

  // Sync preset (aqua, teal, navy, etc.)
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-preset", preset);
  }, [preset]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resolvedTheme,
        preset,
        setPreset,
        presets: THEME_PRESETS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

const DEFAULT_VALUE: ThemeContextValue = {
  theme: "system",
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
