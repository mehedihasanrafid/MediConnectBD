import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Page.module.css";

export interface PageProps {
  className?: string;
  children: ReactNode;
}

export function Page({ className, children }: PageProps) {
  return <div className={clsx(styles.page, className)}>{children}</div>;
}

export interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={clsx(styles.header, className)}>
      <div className={styles.headerText}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
