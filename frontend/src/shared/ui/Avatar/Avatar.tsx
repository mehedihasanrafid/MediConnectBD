import clsx from "clsx";
import styles from "./Avatar.module.css";

function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <span data-size={size} className={clsx(styles.root, className)} aria-hidden={!src}>
      {src ? <img src={src} alt={name} className={styles.img} /> : initials(name)}
    </span>
  );
}
