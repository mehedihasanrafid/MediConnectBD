import clsx from "clsx";
import type { ComponentProps } from "react";
import styles from "./Form.module.css";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={clsx(styles.control, className)} {...rest} />;
}
