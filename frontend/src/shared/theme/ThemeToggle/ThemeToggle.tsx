import clsx from "clsx";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/DropdownMenu";
import { IconButton } from "../../ui/IconButton";
import { useTheme } from "../ThemeProvider";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme, preset, setPreset, presets } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          variant="ghost"
          aria-label={`Toggle theme (currently ${theme}, preset ${preset})`}
        >
          {resolvedTheme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={styles.menuContent}>
        {/* Appearance Mode (Light / Dark / Auto) */}
        <div className={styles.sectionTitle}>Mode</div>
        <div className={styles.modeSegmentGrid} role="group" aria-label="Appearance mode">
          <button
            type="button"
            className={clsx(styles.modeButton, theme === "light" && styles.modeButtonActive)}
            onClick={() => setTheme("light")}
            aria-label="Light mode"
          >
            <Sun size={15} />
            <span>Light</span>
          </button>
          <button
            type="button"
            className={clsx(styles.modeButton, theme === "dark" && styles.modeButtonActive)}
            onClick={() => setTheme("dark")}
            aria-label="Dark mode"
          >
            <Moon size={15} />
            <span>Dark</span>
          </button>
          <button
            type="button"
            className={clsx(styles.modeButton, theme === "system" && styles.modeButtonActive)}
            onClick={() => setTheme("system")}
            aria-label="System mode"
          >
            <Laptop size={15} />
            <span>System</span>
          </button>
        </div>

        <DropdownMenuSeparator />

        {/* 10 Theme Presets */}
        <div className={styles.sectionTitle}>Color Theme</div>
        <div className={styles.presetList} role="group" aria-label="Color themes">
          {presets.map((p) => {
            const isSelected = preset === p.id;
            return (
              <DropdownMenuItem
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={clsx(styles.presetItem, isSelected && styles.presetItemActive)}
              >
                <div className={styles.presetItemLeft}>
                  <span
                    className={styles.colorDot}
                    style={{ backgroundColor: `var(${p.variableName})` }}
                    aria-hidden="true"
                  />
                  <span className={styles.presetName}>
                    {p.emoji} {p.name}
                  </span>
                </div>
                {isSelected && <Check size={15} className={styles.checkIcon} />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
