import { useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  Bell,
  CalendarCheck,
  ClipboardList,
  FileSpreadsheet,
  Heart,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "../../../features/auth/AuthContext";
import { Badge } from "../../../shared/ui";
import styles from "./PatientSidebar.module.css";

interface PatientSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
  isHoverExpanded?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * Patient navigation shell for MediConnect BD,
 * styled consistently with DoctorSidebar and AdminSidebar.
 */
export function PatientSidebar({
  collapsed = false,
  onToggle,
  isMobile = false,
  onClose,
  isHoverExpanded = false,
  onMouseEnter,
  onMouseLeave,
}: PatientSidebarProps) {
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

  const isDoctorsActive = location.pathname === "/doctors";
  const isAppointmentsActive =
    location.pathname === "/appointments" ||
    location.pathname === "/patient" ||
    location.pathname.startsWith("/patient/appointments");
  const isCommunicationActive =
    location.pathname.startsWith("/communication") ||
    location.pathname.startsWith("/patient/communication");
  const isPrescriptionsActive =
    location.pathname.startsWith("/prescriptions") ||
    location.pathname.startsWith("/patient/prescriptions");
  const isReportsActive =
    location.pathname.startsWith("/reports") ||
    location.pathname.startsWith("/patient/reports");
  const isFamilyActive =
    location.pathname.startsWith("/family-members") ||
    location.pathname.startsWith("/patient/family-members");
  const isVerifyRxActive = location.pathname === "/verify-prescription";
  const isNotificationsActive = location.pathname.startsWith("/notifications");

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.firstName
        ? user.firstName.slice(0, 2).toUpperCase()
        : "PT";

  return (
    <aside
      className={clsx(
        styles.sidebar,
        collapsed && !isHoverExpanded && styles.sidebarCollapsed,
        collapsed && isHoverExpanded && styles.sidebarHoverExpanded,
      )}
      aria-label="Patient navigation"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Brand Header on Mobile Drawer */}
      <div className={styles.brand}>
        <button
          type="button"
          onClick={() => handleNavClick("/appointments")}
          className={styles.brandLink}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <div className={styles.brandIcon} aria-hidden="true">
            <Heart size={18} />
          </div>
          <span>MediConnect BD</span>
          <span className={styles.portalBadge}>Patient</span>
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
        {/* On/Off Collapse Button inside Sidebar */}
        {!isMobile && onToggle && (
          <div className={styles.collapseRow}>
            <button
              type="button"
              className={styles.collapseToggle}
              onClick={onToggle}
              aria-label={collapsed ? "Expand sidebar (On)" : "Collapse sidebar (Off)"}
              title={collapsed ? "Expand sidebar (On)" : "Collapse sidebar (Off)"}
            >
              <span className={styles.itemIcon} aria-hidden="true">
                {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
              </span>
              <span className={styles.itemLabel}>
                {collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              </span>
            </button>
          </div>
        )}

        {/* Care & Consultations */}
        <div className={styles.sectionGroup}>
          <span className={styles.sectionLabel}>Care &amp; Consultations</span>

          <button
            type="button"
            className={clsx(styles.navItem, isDoctorsActive && styles.navItemActive)}
            onClick={() => handleNavClick("/doctors")}
            aria-current={isDoctorsActive ? "page" : undefined}
            title="Find Doctors"
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <Search size={18} />
            </span>
            <span className={styles.itemLabel}>Find Doctors</span>
          </button>

          <button
            type="button"
            className={clsx(styles.navItem, isAppointmentsActive && styles.navItemActive)}
            onClick={() => handleNavClick("/appointments")}
            aria-current={isAppointmentsActive ? "page" : undefined}
            title="My Appointments"
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <CalendarCheck size={18} />
            </span>
            <span className={styles.itemLabel}>My Appointments</span>
          </button>

          <button
            type="button"
            className={clsx(styles.navItem, isCommunicationActive && styles.navItemActive)}
            onClick={() => handleNavClick("/patient/communication")}
            aria-current={isCommunicationActive ? "page" : undefined}
            title="Consultation Hub"
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <MessageSquare size={18} />
            </span>
            <span className={styles.itemLabel}>Consultation Messages</span>
          </button>
        </div>

        {/* Health Records */}
        <div className={styles.sectionGroup}>
          <span className={styles.sectionLabel}>Health Records</span>

          <button
            type="button"
            className={clsx(styles.navItem, isPrescriptionsActive && styles.navItemActive)}
            onClick={() => handleNavClick("/prescriptions")}
            aria-current={isPrescriptionsActive ? "page" : undefined}
            title="My Prescriptions"
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <ClipboardList size={18} />
            </span>
            <span className={styles.itemLabel}>Digital Prescriptions</span>
          </button>

          <button
            type="button"
            className={clsx(styles.navItem, isReportsActive && styles.navItemActive)}
            onClick={() => handleNavClick("/reports")}
            aria-current={isReportsActive ? "page" : undefined}
            title="Medical Reports"
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <FileSpreadsheet size={18} />
            </span>
            <span className={styles.itemLabel}>Diagnostic Reports</span>
          </button>

          <button
            type="button"
            className={clsx(styles.navItem, isFamilyActive && styles.navItemActive)}
            onClick={() => handleNavClick("/family-members")}
            aria-current={isFamilyActive ? "page" : undefined}
            title="Family Members"
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <Users size={18} />
            </span>
            <span className={styles.itemLabel}>Family Circle</span>
          </button>
        </div>

        {/* Verification & Alerts */}
        <div className={styles.sectionGroup}>
          <span className={styles.sectionLabel}>Services &amp; Alerts</span>

          <button
            type="button"
            className={clsx(styles.navItem, isVerifyRxActive && styles.navItemActive)}
            onClick={() => handleNavClick("/verify-prescription")}
            aria-current={isVerifyRxActive ? "page" : undefined}
            title="Verify Prescription"
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <ShieldCheck size={18} />
            </span>
            <span className={styles.itemLabel}>Verify Prescription</span>
          </button>

          <button
            type="button"
            className={clsx(styles.navItem, isNotificationsActive && styles.navItemActive)}
            onClick={() => handleNavClick("/notifications")}
            aria-current={isNotificationsActive ? "page" : undefined}
            title="Notifications"
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <Bell size={18} />
            </span>
            <span className={styles.itemLabel}>Notification Center</span>
          </button>
        </div>
      </div>

      {/* Patient Profile & Logout Footer */}
      <div className={styles.profileFooter}>
        <div className={styles.patientCard} title={`${user?.firstName ?? "Patient"} ${user?.lastName ?? ""}`}>
          <div className={styles.avatarInitials} aria-hidden="true">
            {initials}
          </div>
          <div className={styles.patientMeta}>
            <span className={styles.patientName}>
              {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}` : "Patient"}
            </span>
            <div className={styles.patientStatus}>
              <Badge tone="success">
                Verified Patient
              </Badge>
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.logoutButton}
          onClick={() => void handleLogout()}
          aria-label="Sign out of Patient Portal"
          title="Sign Out"
        >
          <LogOut size={16} aria-hidden="true" />
          <span className={styles.itemLabel}>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
