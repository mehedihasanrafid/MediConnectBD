import clsx from "clsx";
import type { CSSProperties, ElementType, ReactNode } from "react";
import styles from "./Layout.module.css";

export type Space = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;

export interface StackProps {
  as?: ElementType;
  gap?: Space;
  className?: string;
  children: ReactNode;
}

export function Stack({ as: Tag = "div", gap = 4, className, children }: StackProps) {
  return (
    <Tag
      className={clsx(styles.stack, className)}
      style={{ "--gap": `var(--space-${gap})` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
