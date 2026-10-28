import clsx from "clsx";
import type { ComponentProps } from "react";
import styles from "./Form.module.css";

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={clsx(styles.control, styles.textarea, className)} {...rest} />;
}
