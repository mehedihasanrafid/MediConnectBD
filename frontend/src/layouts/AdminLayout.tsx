/**
 * Dedicated layout shell for the Admin console, aligned with DokanBD's AdminLayout.
 */

import clsx from "clsx";
import { Outlet } from "react-router-dom";

import { AdminHeader } from "../admin/layout/AdminHeader";
import {
  AdminSidebar,
  useAdminSidebarState,
} from "../admin/navigation/AdminSidebar";
import styles from "./AdminLayout.module.css";

export function AdminLayout() {
  const { collapsed, toggle } = useAdminSidebarState();

  return (
    <div className={styles.root}>
      <AdminHeader />
      <div className={clsx(styles.shell, collapsed && styles.collapsed)}>
        <AdminSidebar collapsed={collapsed} onToggle={toggle} />
        <section className={styles.workspace}>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
