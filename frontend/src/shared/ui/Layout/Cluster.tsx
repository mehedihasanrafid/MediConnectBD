import clsx from "clsx";
import type { CSSProperties, ElementType, ReactNode } from "react";
import type { Space } from "./Stack";
import styles from "./Layout.module.css";

export interface ClusterProps {
  as?: ElementType;
  gap?: Space;
  justify?: "start" | "center" | "end" | "between";
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  wrap?: boolean;
  className?: string;
  children: ReactNode;
}

export function Cluster({
  as: Tag = "div",
  gap = 2,
  justify = "start",
  align = "center",
  wrap = true,
  className,
  children,
}: ClusterProps) {
  return (
    <Tag
      data-justify={justify}
      data-align={align}
      data-wrap={wrap || undefined}
      className={clsx(styles.cluster, className)}
      style={{ "--gap": `var(--space-${gap})` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
