import clsx from "clsx";
import type { ComponentProps } from "react";
import styles from "./Form.module.css";

export function Select({ className, ...rest }: ComponentProps<"select">) {
  return <select className={clsx(styles.control, styles.select, className)} {...rest} />;
}
