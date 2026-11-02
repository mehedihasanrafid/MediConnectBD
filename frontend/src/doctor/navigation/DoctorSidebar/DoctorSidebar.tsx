import { useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  CircleHelp,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Stethoscope,
  Wallet,
  X,
} from "lucide-react";

import { useAuth } from "../../../features/auth/AuthContext";
import { Badge } from "../../../shared/ui";
import styles from "./DoctorSidebar.module.css";

interface DoctorSidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export function DoctorSidebar({ isMobile, onClose }: DoctorSidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (path: string) => {
    if (onClose) onClose();
    navigate(path);
  };

  const handleLogout = async () => {
    if (onClose) onClose();
    await logout();
    navigate("/login");
  };

  // Determine active states across routes and query tabs
  const isTodayActive =
    location.pathname === "/doctor" &&
    (!location.search || location.search === "" || location.search.includes("tab=queue"));

  const isAppointmentsActive =
    location.pathname.startsWith("/doctor/appointments") ||
    location.pathname.startsWith("/doctor/consultations");
  const isPrescriptionsActive = location.pathname.startsWith("/doctor/prescriptions");

  const isScheduleActive =
    location.pathname === "/doctor/schedule" ||
    (location.pathname === "/doctor" && location.search.includes("tab=schedule"));

  const isProfileActive =
    location.pathname === "/doctor/profile" ||
    (location.pathname === "/doctor" && location.search.includes("tab=profile"));

  const isEarningsActive =
    location.pathname === "/doctor/earnings" ||
    (location.pathname === "/doctor" &&
      (location.search.includes("tab=earnings") || location.search.includes("tab=analytics")));

  const isSettingsActive = location.pathname === "/doctor/settings";

  // Application status
  const appStatus = user?.doctorProfile?.applicationStatus ?? "DRAFT";
  const statusLabels: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
    APPROVED: { label: "Approved", tone: "success" },
    PENDING_REVIEW: { label: "Under Review", tone: "warning" },
    REJECTED: { label: "Revisions Needed", tone: "danger" },
    DRAFT: { label: "Application Draft", tone: "neutral" },
  };
  const currentStatusInfo = statusLabels[appStatus] ?? { label: appStatus, tone: "neutral" };

  const initials = `${user?.firstName?.[0] ?? "D"}${user?.lastName?.[0] ?? "R"}`.toUpperCase();

  return (
    <aside className={styles.sidebar} aria-label="Doctor navigation">
      {/* Brand Header */}
      <div className={styles.brand}>
        <button
          type="button"
          onClick={() => handleNavClick("/doctor")}
          className={styles.brandLink}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <div className={styles.brandIcon} aria-hidden="true">
            <Stethoscope size={18} />
          </div>
          <span>MediConnect BD</span>
          <span className={styles.portalBadge}>Doctor</span>
        </button>

        {isMobile && (
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav Content */}
      <div className={styles.navContainer}>
        {/* Workspace */}
        <div className={styles.sectionGroup}>
          <span className={styles.sectionLabel}>Workspace</span>

          <button
            type="button"
            className={clsx(styles.navItem, isTodayActive && styles.navItemActive)}
            onClick={() => handleNavClick("/doctor")}
            aria-current={isTodayActive ? "page" : undefined}
            style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <LayoutDashboard size={18} />
            </span>
            <span>Today&#39;s Overview</span>
          </button>

          <button
            type="button"
            className={clsx(styles.navItem, isAppointmentsActive && styles.navItemActive)}
            onClick={() => handleNavClick("/doctor/appointments")}
            aria-current={isAppointmentsActive ? "page" : undefined}
            style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <CalendarCheck size={18} />
            </span>
            <span>Appointments</span>
          </button>

          <button
            type="button"
            className={clsx(styles.navItem, isPrescriptionsActive && styles.navItemActive)}
            onClick={() => handleNavClick("/doctor/prescriptions")}
            aria-current={isPrescriptionsActive ? "page" : undefined}
            style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <FileText size={18} />
            </span>
            <span>Prescriptions</span>
          </button>
        </div>

        {/* Practice Management */}
        <div className={styles.sectionGroup}>
          <span className={styles.sectionLabel}>Practice Management</span>

          <button
            type="button"
            className={clsx(styles.navItem, isScheduleActive && styles.navItemActive)}
            onClick={() => handleNavClick("/doctor/schedule")}
            aria-current={isScheduleActive ? "page" : undefined}
            style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <CalendarDays size={18} />
            </span>
            <span>Schedule &amp; Leave</span>
          </button>

          <button
            type="button"
            className={clsx(styles.navItem, isProfileActive && styles.navItemActive)}
            onClick={() => handleNavClick("/doctor/profile")}
            aria-current={isProfileActive ? "page" : undefined}
            style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <Building2 size={18} />
            </span>
            <span>Profile &amp; Chambers</span>
          </button>

          <button
            type="button"
            className={clsx(styles.navItem, isEarningsActive && styles.navItemActive)}
            onClick={() => handleNavClick("/doctor/earnings")}
            aria-current={isEarningsActive ? "page" : undefined}
            style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <Wallet size={18} />
            </span>
            <span>Earnings</span>
          </button>
        </div>

        {/* Account */}
        <div className={styles.sectionGroup}>
          <span className={styles.sectionLabel}>Account</span>

          <button
            type="button"
            className={clsx(styles.navItem, isSettingsActive && styles.navItemActive)}
            onClick={() => handleNavClick("/doctor/settings")}
            aria-current={isSettingsActive ? "page" : undefined}
            style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <Settings size={18} />
            </span>
            <span>Settings</span>
          </button>

          <button
            type="button"
            className={clsx(styles.navItem)}
            onClick={() => handleNavClick("/doctor#support")}
            style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <CircleHelp size={18} />
            </span>
            <span>Help &amp; Support</span>
          </button>
        </div>
      </div>

      {/* Profile & Logout Footer */}
      <div className={styles.profileFooter}>
        <div className={styles.doctorCard}>
          <div className={styles.avatarInitials} aria-hidden="true">
            {initials}
          </div>
          <div className={styles.doctorMeta}>
            <span className={styles.doctorName}>
              Dr. {user?.firstName} {user?.lastName}
            </span>
            <div className={styles.doctorStatus}>
              <Badge tone={currentStatusInfo.tone}>
                {currentStatusInfo.label}
              </Badge>
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.logoutButton}
          onClick={() => void handleLogout()}
          aria-label="Sign out of Doctor Portal"
        >
          <LogOut size={16} aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
