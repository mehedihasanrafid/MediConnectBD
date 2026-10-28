import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
export type ButtonSize = "sm" | "md" | "lg";

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}

export type ButtonProps = ComponentProps<"button"> & CommonProps;

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  leftIcon,
  rightIcon,
  fullWidth,
  loading,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      data-variant={variant}
      data-size={size}
      data-full-width={fullWidth || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={clsx(styles.button, className)}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}

export type ButtonLinkProps = LinkProps & CommonProps;

/** A react-router Link that looks like a Button. Use for navigation, never <Button onClick={navigate}>. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      data-variant={variant}
      data-size={size}
      data-full-width={fullWidth || undefined}
      className={clsx(styles.button, className)}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}
