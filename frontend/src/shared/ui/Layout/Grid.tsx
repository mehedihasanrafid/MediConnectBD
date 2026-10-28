import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import type { Space } from "./Stack";
import styles from "./Layout.module.css";

export interface GridProps {
  min?: string;
  gap?: Space;
  className?: string;
  children: ReactNode;
}

export function Grid({ min = "280px", gap = 4, className, children }: GridProps) {
  return (
    <div
      className={clsx(styles.grid, className)}
      style={{ "--grid-min": min, "--gap": `var(--space-${gap})` } as CSSProperties}
    >
      {children}
    </div>
  );
}
