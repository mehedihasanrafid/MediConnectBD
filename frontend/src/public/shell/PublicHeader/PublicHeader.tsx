import React from "react";
import {
  CalendarCheck,
  ClipboardList,
  FileSpreadsheet,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../../../features/auth/AuthContext";
import { isAdmin, isDoctor, isPatient } from "../../../shared/utils/roles";
import styles from "./PublicHeader.module.css";

/**
 * Shared sticky header for public visitors, patients, and doctors,
 * modeled after DokanBD's StorefrontHeader.
 */
export const PublicHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.navLink}${isActive ? ` ${styles.activeNavLink}` : ""}`;

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <Link to="/doctors" className={styles.logo}>
          <HeartPulse size={22} aria-hidden="true" />
          <span>MediConnect BD</span>
        </Link>

        <nav className={styles.navLinks} aria-label="Primary navigation">
          <NavLink to="/doctors" className={linkClass}>
            <Search size={16} aria-hidden="true" />
            <span>Find a doctor</span>
          </NavLink>
          <NavLink to="/verify-prescription" className={linkClass}>
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Verify prescription</span>
          </NavLink>

          {isPatient(user) && (
            <>
              <NavLink to="/appointments" className={linkClass}>
                <CalendarCheck size={16} aria-hidden="true" />
                <span>My appointments</span>
              </NavLink>
              <NavLink to="/prescriptions" className={linkClass}>
                <ClipboardList size={16} aria-hidden="true" />
                <span>My prescriptions</span>
              </NavLink>
              <NavLink to="/reports" className={linkClass}>
                <FileSpreadsheet size={16} aria-hidden="true" />
                <span>Medical reports</span>
              </NavLink>
              <NavLink to="/family-members" className={linkClass}>
                <Users size={16} aria-hidden="true" />
                <span>Family members</span>
              </NavLink>
            </>
          )}

          {isDoctor(user) && (
            <>
              <NavLink to="/doctor" end className={linkClass}>
                <Stethoscope size={16} aria-hidden="true" />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/doctor/appointments" className={linkClass}>
                <CalendarCheck size={16} aria-hidden="true" />
                <span>Appointment queue</span>
              </NavLink>
              <NavLink to="/doctor/prescriptions" className={linkClass}>
                <ClipboardList size={16} aria-hidden="true" />
                <span>Prescriptions</span>
              </NavLink>
            </>
          )}

          {isAdmin(user) && (
            <NavLink to="/admin/overview" className={linkClass}>
              <LayoutDashboard size={16} aria-hidden="true" />
              <span>Admin console</span>
            </NavLink>
          )}
        </nav>

        <div className={styles.actions}>
          {user ? (
            <div className={styles.userMenu}>
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  {user.firstName} {user.lastName}
                </span>
                <span className={styles.roleBadge}>{user.roles.join(", ")}</span>
              </div>

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
          ) : (
            <div className={styles.authLinks}>
              <Link className="btn btn-secondary" to="/register">
                Register
              </Link>
              <Link className="btn btn-primary" to="/login">
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
