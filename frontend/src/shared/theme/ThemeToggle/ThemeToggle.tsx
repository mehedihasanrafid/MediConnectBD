import { Check, Laptop, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/DropdownMenu";
import { IconButton } from "../../ui/IconButton";
import { useTheme } from "../ThemeProvider";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          variant="ghost"
          aria-label={`Toggle theme (currently ${theme})`}
        >
          {resolvedTheme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <div className={styles.itemWithCheck}>
            <span className={styles.itemLabel}>
              <Sun size={16} />
              <span>Light</span>
            </span>
            {theme === "light" && <Check size={16} />}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <div className={styles.itemWithCheck}>
            <span className={styles.itemLabel}>
              <Moon size={16} />
              <span>Dark</span>
            </span>
            {theme === "dark" && <Check size={16} />}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <div className={styles.itemWithCheck}>
            <span className={styles.itemLabel}>
              <Laptop size={16} />
              <span>System</span>
            </span>
            {theme === "system" && <Check size={16} />}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
