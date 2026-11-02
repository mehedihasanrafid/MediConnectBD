import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { DoctorHeader } from "../doctor/navigation/DoctorHeader";
import { DoctorSidebar } from "../doctor/navigation/DoctorSidebar";
import styles from "./DoctorLayout.module.css";

/**
 * Dedicated Layout Shell for MediConnect BD Doctor Portal.
 * Provides persistent left navigation on desktop, an accessible slide-over drawer on mobile,
 * a compact clinical utility header, and an unhindered routed content area.
 */
export function DoctorLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  // Handle Escape key and body scroll lock when mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className={styles.root}>
      {/* 1. Desktop Persistent Sidebar */}
      <div className={styles.desktopSidebarWrap}>
        <DoctorSidebar />
      </div>

      {/* 2. Accessible Mobile Navigation Drawer */}
      {mobileOpen && (
        <div
          className={styles.drawerBackdrop}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        >
          <div
            className={styles.drawerPanel}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Doctor navigation drawer"
          >
            <DoctorSidebar isMobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* 3. Main Workspace Area */}
      <div className={styles.mainColumn}>
        <DoctorHeader
          onToggleMobile={() => setMobileOpen((prev) => !prev)}
          isMobileOpen={mobileOpen}
        />
        <main id="doctor-workspace" className={styles.workspace}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
