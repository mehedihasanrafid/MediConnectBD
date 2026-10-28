import clsx from "clsx";
import type { ElementType, ReactNode } from "react";
import styles from "./Card.module.css";

export interface CardProps {
  as?: ElementType;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({ as: Tag = "div", padding = "md", interactive, className, children }: CardProps) {
  return (
    <Tag data-padding={padding} data-interactive={interactive || undefined} className={clsx(styles.root, className)}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={styles.header}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
