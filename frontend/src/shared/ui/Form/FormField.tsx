import clsx from "clsx";
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import styles from "./Form.module.css";

export interface FormFieldProps {
  label: ReactNode;
  children: ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
}

export function FormField({ label, children, hint, error, required, className }: FormFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id ?? id,
        "aria-describedby": children.props["aria-describedby"] ?? describedBy,
        "aria-invalid": children.props["aria-invalid"] ?? (error ? true : undefined),
      })
    : children;

  return (
    <div className={clsx(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && <span className={styles.required} aria-hidden> *</span>}
      </label>
      {control}
      {hint && <p id={hintId} className={styles.hint}>{hint}</p>}
      {error && <p id={errorId} className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
