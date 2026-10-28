import * as RT from "@radix-ui/react-tabs";
import clsx from "clsx";
import type { ComponentProps } from "react";
import styles from "./Tabs.module.css";

export const Tabs = RT.Root;

export function TabsList({ className, ...rest }: ComponentProps<typeof RT.List>) {
  return <RT.List className={clsx(styles.list, className)} {...rest} />;
}

export function TabsTrigger({ className, ...rest }: ComponentProps<typeof RT.Trigger>) {
  return <RT.Trigger className={clsx(styles.trigger, className)} {...rest} />;
}

export function TabsContent({ className, ...rest }: ComponentProps<typeof RT.Content>) {
  return <RT.Content className={clsx(styles.content, className)} {...rest} />;
}
