import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import clsx from "clsx";

import { DoctorHeader } from "../doctor/navigation/DoctorHeader";
import {
  DoctorSidebar,
  useDoctorSidebarState,
} from "../doctor/navigation/DoctorSidebar";
import styles from "./DoctorLayout.module.css";

/**
 * Dedicated Layout Shell for MediConnect BD Doctor Portal.
 * Provides sticky left navigation on desktop with on/off collapse & hover-peek capabilities,
 * an accessible slide-over drawer on mobile, a sticky full-width clinical utility header,
 * and an independently scrolling routed workspace.
 */
export function DoctorLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { collapsed, isHovered, toggle, onMouseEnter, onMouseLeave } = useDoctorSidebarState();

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
      {/* 1. Full-Width Sticky Top Clinical Utility Header */}
      <DoctorHeader
        onToggleMobile={() => setMobileOpen((prev) => !prev)}
        isMobileOpen={mobileOpen}
      />

      {/* 2. Body Shell: Pinned Sidebar & Routed Content Below Header */}
      <div className={styles.shell}>
        {/* Desktop Persistent Sidebar with On/Off collapse & hover expansion */}
        <div
          className={clsx(
            styles.desktopSidebarWrap,
            collapsed && styles.desktopSidebarWrapCollapsed,
          )}
        >
          <DoctorSidebar
            isCollapsed={collapsed}
            onToggleCollapse={toggle}
            isHoverExpanded={isHovered}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          />
        </div>

        {/* Accessible Mobile Navigation Drawer */}
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

        {/* Main Workspace Area (Independently scrolling) */}
        <main id="doctor-workspace" className={styles.workspace}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
