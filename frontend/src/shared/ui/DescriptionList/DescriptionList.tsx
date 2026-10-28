import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./DescriptionList.module.css";

export interface DescriptionItem {
  label: ReactNode;
  value: ReactNode;
}

export interface DescriptionListProps {
  items: DescriptionItem[];
  columns?: "auto" | 1 | 2 | 3;
  className?: string;
}

export function DescriptionList({ items, columns = "auto", className }: DescriptionListProps) {
  return (
    <dl data-columns={columns} className={clsx(styles.root, className)}>
      {items.map((item, i) => (
        <div key={i} className={styles.item}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={styles.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
