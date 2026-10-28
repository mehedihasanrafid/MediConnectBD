import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";
const TONES: readonly BadgeTone[] = ["neutral", "primary", "success", "warning", "danger", "info"];

/** `tone` accepts string for backward compatibility; unknown values fall back to "neutral". */
export function Badge({
  children,
  tone = "neutral",
  dot,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone | string;
  dot?: boolean;
  className?: string;
}) {
  const safeTone = (TONES as readonly string[]).includes(tone as BadgeTone) ? tone : "neutral";
  return (
    <span data-tone={safeTone} className={clsx(styles.root, className)}>
      {dot && <span className={styles.dot} aria-hidden />}
      {children}
    </span>
  );
}
