import clsx from "clsx";
import type { ComponentProps } from "react";
import styles from "./IconButton.module.css";

type Props = Omit<ComponentProps<"button">, "aria-label"> & {
  "aria-label": string;
  variant?: "ghost" | "secondary" | "danger";
  size?: "sm" | "md";
};

export function IconButton({ variant = "ghost", size = "md", type = "button", className, ...rest }: Props) {
  return <button type={type} data-variant={variant} data-size={size} className={clsx(styles.root, className)} {...rest} />;
}
