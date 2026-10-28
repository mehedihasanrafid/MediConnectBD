import clsx from "clsx";
import type { ElementType, ReactNode } from "react";
import styles from "./Text.module.css";

export interface TextProps {
  as?: ElementType;
  tone?: "default" | "muted" | "subtle" | "primary" | "danger" | "success";
  size?: "xs" | "sm" | "base" | "lg";
  weight?: "medium" | "semibold" | "bold";
  className?: string;
  children: ReactNode;
}

export function Text({
  as: Tag = "p",
  tone = "default",
  size = "base",
  weight,
  className,
  children,
}: TextProps) {
  return (
    <Tag
      data-tone={tone}
      data-size={size}
      data-weight={weight}
      className={clsx(styles.text, className)}
    >
      {children}
    </Tag>
  );
}
