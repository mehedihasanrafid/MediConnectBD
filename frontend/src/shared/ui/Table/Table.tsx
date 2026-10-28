import clsx from "clsx";
import type { ComponentProps } from "react";
import styles from "./Table.module.css";

export function Table({ className, ...rest }: ComponentProps<"table">) {
  return (
    <div className={styles.wrapper}>
      <table className={clsx(styles.table, className)} {...rest} />
    </div>
  );
}
