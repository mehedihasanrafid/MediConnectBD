import React from "react";
import { ExternalLink, LayoutDashboard, LogOut, Stethoscope } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../../features/auth/AuthContext";
import styles from "./AdminHeader.module.css";

/**
 * AdminHeader — Top navigation bar for /admin routes, aligned with DokanBD's AdminHeader.
 * Contains: MediConnect BD brand link, public directory shortcut, dashboard link, user badge, and sign out.
 */
export const AdminHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <Link to="/admin/overview" className={styles.logo} aria-label="MediConnect BD Admin Console">
          <Stethoscope size={22} aria-hidden="true" />
          <span>MediConnect BD</span>
          <span className={styles.logoBadge}>Admin</span>
        </Link>

        <div className={styles.actions}>
          <Link to="/doctors" className={`btn btn-ghost ${styles.dashboardLink}`}>
            <ExternalLink size={17} aria-hidden="true" />
            <span>Public Directory</span>
          </Link>

          <Link to="/admin/overview" className={`btn btn-ghost ${styles.dashboardLink}`}>
            <LayoutDashboard size={18} aria-hidden="true" />
            <span>Overview</span>
          </Link>

          {user && (
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {user.firstName} {user.lastName}
              </span>
              <span className={styles.roleBadge}>{user.roles.join(", ")}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              void logout().then(() => navigate("/login"));
            }}
            className="btn-icon"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={19} />
          </button>
        </div>
      </div>
    </header>
  );
};
