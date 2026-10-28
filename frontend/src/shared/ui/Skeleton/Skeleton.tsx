import clsx from "clsx";
import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

export interface SkeletonProps {
  width?: string;
  height?: string;
  radius?: string;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = "1rem",
  radius = "var(--radius-sm)",
  className,
}: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={clsx(styles.root, className)}
      style={{ "--sk-w": width, "--sk-h": height, "--sk-r": radius } as CSSProperties}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className={styles.card} aria-hidden>
      <Skeleton width="3rem" height="3rem" radius="var(--radius-full)" />
      <Skeleton width="60%" height="1.1rem" />
      <Skeleton width="40%" />
      <Skeleton height="2.5rem" radius="var(--radius-md)" />
    </div>
  );
}
