import styles from "./Spinner.module.css";

export interface SpinnerProps {
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function Spinner({ label = "Loading…", size = "md" }: SpinnerProps) {
  return (
    <div role="status" aria-live="polite" className={styles.root}>
      <span data-size={size} className={styles.ring} aria-hidden />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
