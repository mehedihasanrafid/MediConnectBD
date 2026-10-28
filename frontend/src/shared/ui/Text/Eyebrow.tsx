import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Text.module.css";

export interface EyebrowProps {
  className?: string;
  children: ReactNode;
}

export function Eyebrow({ className, children }: EyebrowProps) {
  return <p className={clsx(styles.eyebrow, className)}>{children}</p>;
}
