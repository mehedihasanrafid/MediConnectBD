import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import clsx from "clsx";

import { PatientHeader } from "../patient/navigation/PatientHeader";
import {
  PatientSidebar,
  usePatientSidebarState,
} from "../patient/navigation/PatientSidebar";
import styles from "./PatientLayout.module.css";

/**
 * Dedicated layout shell for the Patient portal,
 * matching DoctorLayout and AdminLayout with sticky full-width header,
 * collapsible rail sidebar with hover-peek, and mobile drawer.
 */
export function PatientLayout() {
  const [isMobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { collapsed, isHovered, toggle, onMouseEnter, onMouseLeave } = usePatientSidebarState();

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className={styles.root}>
      <PatientHeader
        onToggleMobile={() => setMobileOpen((prev) => !prev)}
        isMobileOpen={isMobileOpen}
      />
      <div className={styles.shell}>
        <div
          className={clsx(
            styles.desktopSidebarWrap,
            collapsed && styles.desktopSidebarWrapCollapsed,
          )}
        >
          <PatientSidebar
            collapsed={collapsed}
            onToggle={toggle}
            isHoverExpanded={isHovered}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          />
        </div>

        {isMobileOpen && (
          <div
            className={styles.drawerBackdrop}
            onClick={() => setMobileOpen(false)}
            role="presentation"
          >
            <div
              className={styles.drawerPanel}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation drawer"
            >
              <PatientSidebar isMobile onClose={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <main className={styles.workspace}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
