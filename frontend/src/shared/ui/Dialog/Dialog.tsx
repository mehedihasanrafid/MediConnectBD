import * as RD from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./Dialog.module.css";

export const Dialog = RD.Root;
export const DialogTrigger = RD.Trigger;
export const DialogClose = RD.Close;

export interface DialogContentProps {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

export function DialogContent({ title, description, children, footer }: DialogContentProps) {
  return (
    <RD.Portal>
      <RD.Overlay className={styles.overlay} />
      <RD.Content className={styles.content}>
        <div className={styles.header}>
          <RD.Title className={styles.title}>{title}</RD.Title>
          <RD.Close className={styles.close} aria-label="Close">
            <X size={18} />
          </RD.Close>
        </div>
        {description && <RD.Description className={styles.description}>{description}</RD.Description>}
        {children && <div className={styles.body}>{children}</div>}
        {footer && <div className={styles.footer}>{footer}</div>}
      </RD.Content>
    </RD.Portal>
  );
}
