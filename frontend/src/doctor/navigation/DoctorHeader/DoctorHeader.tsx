import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  ChevronRight,
  Clock,
  FileText,
  LogOut,
  Menu,
  Settings,
  Stethoscope,
  User,
  Wallet,
} from "lucide-react";

import { useAuth } from "../../../features/auth/AuthContext";
import { ThemeToggle } from "../../../shared/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../shared/ui";
import styles from "./DoctorHeader.module.css";

interface DoctorHeaderProps {
  onToggleMobile: () => void;
  isMobileOpen: boolean;
}

export function DoctorHeader({ onToggleMobile, isMobileOpen }: DoctorHeaderProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dhakaTime, setDhakaTime] = useState(() => {
    try {
      return new Date().toLocaleTimeString("en-US", {
        timeZone: "Asia/Dhaka",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  });

  // Live Asia/Dhaka clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDhakaTime(
        now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Dhaka",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute dynamic page title
  const getPageTitle = () => {
    if (location.pathname.startsWith("/doctor/consultations")) {
      return "Clinical Consultation Workspace";
    }
    if (location.pathname.startsWith("/doctor/appointments")) {
      return "Patient Appointment Queue";
    }
    if (location.pathname.startsWith("/doctor/prescriptions")) {
      return "Digital Prescriptions";
    }
    if (location.pathname.startsWith("/doctor/profile")) {
      return "Doctor Profile & Chambers";
    }
    if (location.pathname.startsWith("/doctor/schedule")) {
      return "Doctor Schedule & Working Hours";
    }
    if (location.pathname.startsWith("/doctor/earnings")) {
      return "Earnings & Practice Performance";
    }
    if (location.pathname.startsWith("/doctor/settings")) {
      return "Doctor Account Settings";
    }
    if (location.pathname === "/doctor") {
      const search = location.search;
      if (search.includes("tab=schedule")) return "Weekly Schedule & Chambers";
      if (search.includes("tab=profile")) return "Doctor Profile & Qualifications";
      if (search.includes("tab=earnings") || search.includes("tab=analytics")) {
        return "Practice Analytics & Revenue";
      }
      return "Today's Clinical Overview";
    }
    return "Doctor Workspace";
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = `${user?.firstName?.[0] ?? "D"}${user?.lastName?.[0] ?? "R"}`.toUpperCase();

  return (
    <header className={styles.header} aria-label="Doctor Utility Header">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className={styles.leftSection}>
        <button
          type="button"
          className={styles.mobileToggle}
          onClick={onToggleMobile}
          aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileOpen}
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <nav className={styles.breadcrumbTrail} aria-label="Breadcrumb navigation">
          <Link to="/doctor" className={styles.breadcrumbLink}>
            Doctor Portal
          </Link>
          <span className={styles.separator} aria-hidden="true">
            <ChevronRight size={14} />
          </span>
          <span className={styles.currentPage} aria-current="page">
            {getPageTitle()}
          </span>
        </nav>
      </div>

      {/* Right: Dhaka Time, Theme, Account */}
      <div className={styles.rightSection}>
        {dhakaTime && (
          <div className={styles.dhakaClock} aria-label={`Dhaka time: ${dhakaTime}`}>
            <span className={styles.clockDot} aria-hidden="true" />
            <Clock size={12} aria-hidden="true" />
            <span>Asia/Dhaka {dhakaTime}</span>
          </div>
        )}

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={styles.accountTrigger}
              aria-label={`Account menu for Dr. ${user?.firstName} ${user?.lastName}`}
            >
              <div className={styles.userAvatar} aria-hidden="true">
                {initials}
              </div>
              <span className={styles.userNameLabel}>
                Dr. {user?.firstName}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" style={{ minWidth: "220px" }}>
            <div className={styles.menuHeader}>
              <span className={styles.menuName}>
                Dr. {user?.firstName} {user?.lastName}
              </span>
              <span className={styles.menuEmail}>{user?.email}</span>
            </div>

            <DropdownMenuItem onClick={() => navigate("/doctor")}>
              <Stethoscope size={15} style={{ marginRight: "8px" }} />
              Today&#39;s Overview
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate("/doctor/appointments")}>
              <CalendarCheck size={15} style={{ marginRight: "8px" }} />
              Appointment Queue
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate("/doctor/prescriptions")}>
              <FileText size={15} style={{ marginRight: "8px" }} />
              Prescriptions
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate("/doctor/profile")}>
              <User size={15} style={{ marginRight: "8px" }} />
              Profile Details
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate("/doctor/earnings")}>
              <Wallet size={15} style={{ marginRight: "8px" }} />
              Earnings &amp; Revenue
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate("/doctor/settings")}>
              <Settings size={15} style={{ marginRight: "8px" }} />
              Account Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => void handleLogout()}>
              <LogOut size={15} style={{ marginRight: "8px", color: "var(--color-danger)" }} />
              <span style={{ color: "var(--color-danger)" }}>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
