import clsx from "clsx";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./Alert.module.css";

const ICONS = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert,
};

export interface AlertProps {
  kind: "error" | "success" | "info" | "warning";
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Alert({ kind, title, children, className }: AlertProps) {
  const Icon = ICONS[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} data-kind={kind} className={clsx(styles.root, className)}>
      <Icon size={18} aria-hidden className={styles.icon} />
      <div>
        {title && <p className={styles.title}>{title}</p>}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
