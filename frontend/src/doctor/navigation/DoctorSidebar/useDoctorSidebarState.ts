import { useState } from "react";

const DOCTOR_SIDEBAR_STORAGE_KEY = "mediconnectbd.doctor.sidebar.collapsed";

/**
 * Manages the doctor's desktop sidebar expanded/collapsed state and hover peek state.
 * Persists user preference in localStorage.
 */
export function useDoctorSidebarState() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DOCTOR_SIDEBAR_STORAGE_KEY) === "true";
  });

  const [isHovered, setIsHovered] = useState(false);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(DOCTOR_SIDEBAR_STORAGE_KEY, String(next));
      }
      return next;
    });
  };

  const onMouseEnter = () => {
    if (collapsed) {
      setIsHovered(true);
    }
  };

  const onMouseLeave = () => {
    if (collapsed) {
      setIsHovered(false);
    }
  };

  return {
    collapsed,
    isHovered,
    toggle,
    onMouseEnter,
    onMouseLeave,
  };
}
