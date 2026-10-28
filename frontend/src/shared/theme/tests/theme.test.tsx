import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ThemeProvider, THEME_PRESETS, useTheme } from "../ThemeProvider";
import { ThemeToggle } from "../ThemeToggle";

function TestConsumer() {
  const { theme, preset, presets } = useTheme();
  return (
    <div data-testid="consumer">
      <span data-testid="theme">{theme}</span>
      <span data-testid="preset">{preset}</span>
      <span data-testid="count">{presets.length}</span>
    </div>
  );
}

describe("Theme System (Phase 5 & Dynamic Presets)", () => {
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
});
