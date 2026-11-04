import { renderToString } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AuthContext, type AuthContextValue } from "../../../features/auth/AuthContext";
import type { PublicUser } from "../../../shared/types";
import {
  ThemeProvider,
  THEME_PRESETS,
  THEME_STORAGE_KEY,
  PRESET_STORAGE_KEY,
  useTheme,
} from "../ThemeProvider";
import { ThemeToggle } from "../ThemeToggle";

function TestConsumer() {
  const { theme, resolvedTheme, preset, presets } = useTheme();
  return (
    <div data-testid="consumer">
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <span data-testid="preset">{preset}</span>
      <span data-testid="count">{presets.length}</span>
    </div>
  );
}

function createMockAuth(user: PublicUser | null): AuthContextValue {
  return {
    user,
    loading: false,
    login: vi.fn(),
    registerPatient: vi.fn(),
    registerDoctor: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
  };
}

const mockPatient: PublicUser = {
  id: "u-1",
  email: "patient@mediconnect.bd",
  roles: ["PATIENT"],
  firstName: "Rahim",
  lastName: "Uddin",
  status: "ACTIVE",
  patientProfileId: "prof-1",
  doctorProfile: null,
};

describe("Theme System (Phase 5 & Dynamic Presets)", () => {
  const storageMap = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => {
      storageMap.set(key, val);
    },
    removeItem: (key: string) => {
      storageMap.delete(key);
    },
    clear: () => {
      storageMap.clear();
    },
  };

  beforeEach(() => {
    storageMap.clear();
    // Provide minimal mock window object for theme storage and media query detection
    globalThis.window = {
      localStorage: mockLocalStorage as unknown as Storage,
      matchMedia: () =>
        ({
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    } as unknown as Window & typeof globalThis;
  });

  it("renders ThemeToggle with accessible button and fallback values", () => {
    const html = renderToString(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(html).toContain("Toggle theme");
    expect(html).toContain("preset aqua");
  });

  it("renders without crashing even outside ThemeProvider thanks to safe fallback", () => {
    const html = renderToString(<ThemeToggle />);
    expect(html).toContain("Toggle theme");
  });

  it("provides 10 theme presets with default aqua water", () => {
    expect(THEME_PRESETS).toHaveLength(10);
    expect(THEME_PRESETS[0].id).toBe("aqua");

    const html = renderToString(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(html).toContain("aqua");
    expect(html).toContain("10");
  });

  it("forces light mode and aqua preset for unauthenticated users, ignoring stored preferences without deleting them", () => {
    // Simulate user previously saved dark mode and coral preset
    storageMap.set(THEME_STORAGE_KEY, "dark");
    storageMap.set(PRESET_STORAGE_KEY, "coral");

    const html = renderToString(
      <AuthContext.Provider value={createMockAuth(null)}>
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      </AuthContext.Provider>,
    );

    // Effective presentation must be fixed light aqua for public visitors
    expect(html).toContain('<span data-testid="theme">light</span>');
    expect(html).toContain('<span data-testid="resolved">light</span>');
    expect(html).toContain('<span data-testid="preset">aqua</span>');

    // Stored preferences were NOT deleted or overwritten with "light"/"aqua"
    expect(storageMap.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(storageMap.get(PRESET_STORAGE_KEY)).toBe("coral");
  });

  it("restores user's saved mode and color preset when authenticated", () => {
    storageMap.set(THEME_STORAGE_KEY, "dark");
    storageMap.set(PRESET_STORAGE_KEY, "coral");

    const html = renderToString(
      <AuthContext.Provider value={createMockAuth(mockPatient)}>
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      </AuthContext.Provider>,
    );

    // Authenticated user receives their saved preferences
    expect(html).toContain('<span data-testid="theme">dark</span>');
    expect(html).toContain('<span data-testid="resolved">dark</span>');
    expect(html).toContain('<span data-testid="preset">coral</span>');
  });

  it("keeps public pages light aqua for signed-in users without overwriting portal preferences", () => {
    storageMap.set(THEME_STORAGE_KEY, "dark");
    storageMap.set(PRESET_STORAGE_KEY, "coral");
    const html = renderToString(
      <AuthContext.Provider value={createMockAuth(mockPatient)}>
        <ThemeProvider publicPage><TestConsumer /></ThemeProvider>
      </AuthContext.Provider>,
    );
    expect(html).toContain('<span data-testid="resolved">light</span>');
    expect(html).toContain('<span data-testid="preset">aqua</span>');
    expect(storageMap.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(storageMap.get(PRESET_STORAGE_KEY)).toBe("coral");
  });
});
