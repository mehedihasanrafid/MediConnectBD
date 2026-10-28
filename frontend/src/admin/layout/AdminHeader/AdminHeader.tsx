import React from "react";
import { ExternalLink, LayoutDashboard, LogOut, Stethoscope } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../../features/auth/AuthContext";
import { ThemeToggle } from "../../../shared/theme";
import { ButtonLink, IconButton } from "../../../shared/ui";
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
          <ButtonLink to="/doctors" variant="ghost" size="sm" className={styles.dashboardLink}>
            <ExternalLink size={17} aria-hidden="true" />
            <span>Public Directory</span>
          </ButtonLink>

          <ButtonLink to="/admin/overview" variant="ghost" size="sm" className={styles.dashboardLink}>
            <LayoutDashboard size={18} aria-hidden="true" />
            <span>Overview</span>
          </ButtonLink>

          {user && (
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {user.firstName} {user.lastName}
              </span>
              <span className={styles.roleBadge}>{user.roles.join(", ")}</span>
            </div>
          )}

          <ThemeToggle />

          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => {
              void logout().then(() => navigate("/login"));
            }}
          >
            <LogOut size={19} />
          </IconButton>
        </div>
      </div>
    </header>
  );
};
