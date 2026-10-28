import * as RDM from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";
import type { ComponentProps } from "react";
import styles from "./DropdownMenu.module.css";

export const DropdownMenu = RDM.Root;
export const DropdownMenuTrigger = RDM.Trigger;

export function DropdownMenuContent({ className, ...rest }: ComponentProps<typeof RDM.Content>) {
  return (
    <RDM.Portal>
      <RDM.Content className={clsx(styles.content, className)} {...rest} />
    </RDM.Portal>
  );
}

export function DropdownMenuItem({ className, ...rest }: ComponentProps<typeof RDM.Item>) {
  return <RDM.Item className={clsx(styles.item, className)} {...rest} />;
}

export function DropdownMenuSeparator({ className, ...rest }: ComponentProps<typeof RDM.Separator>) {
  return <RDM.Separator className={clsx(styles.separator, className)} {...rest} />;
}
