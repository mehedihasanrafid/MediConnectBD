import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Layout.module.css";

export interface ContainerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  children: ReactNode;
}

export function Container({ size = "lg", className, children }: ContainerProps) {
  return (
    <div data-size={size} className={clsx(styles.container, className)}>
      {children}
    </div>
  );
}
