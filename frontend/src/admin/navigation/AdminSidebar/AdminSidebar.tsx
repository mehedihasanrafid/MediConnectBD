import { useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { LogOut, PanelLeftClose, PanelLeftOpen, Stethoscope, X } from "lucide-react";
import { adminSidebarSections } from "./adminSidebar.config";
import { useAuth } from "../../../features/auth/AuthContext";
import { Badge } from "../../../shared/ui";
import styles from "./AdminSidebar.module.css";
interface AdminSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
  isHoverExpanded?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}
export function AdminSidebar({
  collapsed = false,
  onToggle,
  isMobile = false,
  onClose,
  isHoverExpanded = false,
  onMouseEnter,
  onMouseLeave,
}: AdminSidebarProps) {
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

  const active = (to: string, exact?: boolean) => location.pathname === to ||
    (to === "/admin/overview" && location.pathname === "/admin") ||
    (to === "/admin/notifications" && location.pathname === "/notifications") ||
    (!exact && location.pathname.startsWith(`${to}/`));

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.firstName
        ? user.firstName.slice(0, 2).toUpperCase()
        : "AD";

  return (
    <aside
      className={clsx(
        styles.sidebar,
        collapsed && !isHoverExpanded && styles.sidebarCollapsed,
        collapsed && isHoverExpanded && styles.sidebarHoverExpanded,
      )}
      aria-label="Admin navigation"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.brand}>
        <button
          type="button"
          onClick={() => handleNavClick("/admin/overview")}
          className={styles.brandLink}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <div className={styles.brandIcon} aria-hidden="true">
            <Stethoscope size={18} />
          </div>
          <span>MediConnect BD</span>
          <span className={styles.portalBadge}>Admin</span>
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

      <div className={styles.navContainer}>
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

        {adminSidebarSections.map((section) => <div className={styles.sectionGroup} key={section.id}>
          <span className={styles.sectionLabel}>{section.label ?? "Workspace"}</span>
          {section.items.map(({ to, label, icon: Icon, exact }) => <button key={to} type="button"
            className={clsx(styles.navItem, active(to, exact) && styles.navItemActive)}
            onClick={() => handleNavClick(to)} aria-current={active(to, exact) ? "page" : undefined} title={label}>
            <span className={styles.itemIcon} aria-hidden="true"><Icon size={18} /></span>
            <span className={styles.itemLabel}>{label}</span>
          </button>)}
        </div>)}
      </div>

      <div className={styles.profileFooter}>
        <div className={styles.adminCard} title={`${user?.firstName ?? "Admin"} ${user?.lastName ?? ""}`}>
          <div className={styles.avatarInitials} aria-hidden="true">
            {initials}
          </div>
          <div className={styles.adminMeta}>
            <span className={styles.adminName}>
              {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}` : "Administrator"}
            </span>
            <div className={styles.adminStatus}>
              <Badge tone="primary">
                Administrator
              </Badge>
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.logoutButton}
          onClick={() => void handleLogout()}
          aria-label="Sign out of Admin Console"
          title="Sign Out"
        >
          <LogOut size={16} aria-hidden="true" />
          <span className={styles.itemLabel}>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
