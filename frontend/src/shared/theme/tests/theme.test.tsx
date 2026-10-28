import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "../ThemeProvider";
import { ThemeToggle } from "../ThemeToggle";

describe("Theme System (Phase 5)", () => {
  it("renders ThemeToggle with accessible button and fallback values", () => {
    const html = renderToString(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(html).toContain("Toggle theme");
  });

  it("renders without crashing even outside ThemeProvider thanks to safe fallback", () => {
    const html = renderToString(<ThemeToggle />);
    expect(html).toContain("Toggle theme");
  });
});
