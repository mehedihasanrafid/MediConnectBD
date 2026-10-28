import React, { useEffect, useState } from "react";
import {
  CalendarCheck,
  ClipboardList,
  FileSpreadsheet,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../../features/auth/AuthContext";
import { isAdmin, isDoctor, isPatient } from "../../../shared/utils/roles";
import styles from "./PublicHeader.module.css";

/**
 * Shared sticky header for public visitors, patients, and doctors,
 * with responsive mobile drawer navigation and full keyboard accessibility.
 */
export const PublicHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.navLink}${isActive ? ` ${styles.activeNavLink}` : ""}`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.mobileNavLink}${isActive ? ` ${styles.mobileActiveNavLink}` : ""}`;

  const closeMenu = () => setIsOpen(false);

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <Link to="/doctors" className={styles.logo} onClick={closeMenu}>
          <HeartPulse size={22} aria-hidden="true" />
          <span>MediConnect BD</span>
        </Link>

        {/* Desktop primary navigation */}
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

        {/* Top-bar actions (desktop user menu & mobile menu toggle) */}
        <div className={styles.actions}>
          {user ? (
            <div className={styles.userMenu}>
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  {`${user.firstName} ${user.lastName}`}
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

          {/* Mobile hamburger menu toggle button */}
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {isOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation backdrop */}
      {isOpen && (
        <div
          className={styles.backdrop}
          onClick={closeMenu}
          aria-hidden="true"
          data-testid="mobile-backdrop"
        />
      )}

      {/* Mobile slide-out navigation drawer */}
      <nav
        id="mobile-navigation"
        className={`${styles.mobileDrawer}${isOpen ? ` ${styles.mobileDrawerOpen}` : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!isOpen}
      >
        <div className={styles.drawerHeader}>
          <div className={styles.drawerLogo}>
            <HeartPulse size={20} aria-hidden="true" />
            <span>MediConnect BD</span>
          </div>
          <button
            type="button"
            className={styles.drawerCloseButton}
            onClick={closeMenu}
            aria-label="Close navigation"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.mobileNavLinks}>
          <NavLink to="/doctors" className={mobileLinkClass} onClick={closeMenu}>
            <Search size={18} aria-hidden="true" />
            <span>Find a doctor</span>
          </NavLink>
          <NavLink to="/verify-prescription" className={mobileLinkClass} onClick={closeMenu}>
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Verify prescription</span>
          </NavLink>

          {isPatient(user) && (
            <>
              <NavLink to="/appointments" className={mobileLinkClass} onClick={closeMenu}>
                <CalendarCheck size={18} aria-hidden="true" />
                <span>My appointments</span>
              </NavLink>
              <NavLink to="/prescriptions" className={mobileLinkClass} onClick={closeMenu}>
                <ClipboardList size={18} aria-hidden="true" />
                <span>My prescriptions</span>
              </NavLink>
              <NavLink to="/reports" className={mobileLinkClass} onClick={closeMenu}>
                <FileSpreadsheet size={18} aria-hidden="true" />
                <span>Medical reports</span>
              </NavLink>
              <NavLink to="/family-members" className={mobileLinkClass} onClick={closeMenu}>
                <Users size={18} aria-hidden="true" />
                <span>Family members</span>
              </NavLink>
            </>
          )}

          {isDoctor(user) && (
            <>
              <NavLink to="/doctor" end className={mobileLinkClass} onClick={closeMenu}>
                <Stethoscope size={18} aria-hidden="true" />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/doctor/appointments" className={mobileLinkClass} onClick={closeMenu}>
                <CalendarCheck size={18} aria-hidden="true" />
                <span>Appointment queue</span>
              </NavLink>
              <NavLink to="/doctor/prescriptions" className={mobileLinkClass} onClick={closeMenu}>
                <ClipboardList size={18} aria-hidden="true" />
                <span>Prescriptions</span>
              </NavLink>
            </>
          )}

          {isAdmin(user) && (
            <NavLink to="/admin/overview" className={mobileLinkClass} onClick={closeMenu}>
              <LayoutDashboard size={18} aria-hidden="true" />
              <span>Admin console</span>
            </NavLink>
          )}
        </div>

        <div className={styles.mobileDrawerFooter}>
          {user ? (
            <div className={styles.mobileUserSection}>
              <div className={styles.mobileUserInfo}>
                <span className={styles.userName}>
                  {`${user.firstName} ${user.lastName}`}
                </span>
                <span className={styles.roleBadge}>{user.roles.join(", ")}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  void logout().then(() => navigate("/login"));
                }}
                className={`btn btn-secondary ${styles.mobileSignOutButton}`}
              >
                <LogOut size={16} aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <div className={styles.mobileAuthActions}>
              <Link className="btn btn-secondary" to="/register" onClick={closeMenu}>
                Register
              </Link>
              <Link className="btn btn-primary" to="/login" onClick={closeMenu}>
                Sign in
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};
