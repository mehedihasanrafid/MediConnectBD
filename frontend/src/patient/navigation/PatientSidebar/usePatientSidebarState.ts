import { useState } from "react";

const PATIENT_SIDEBAR_STORAGE_KEY = "mediconnectbd.patient.sidebar.collapsed";

/**
 * Manages the patient's desktop sidebar expanded/collapsed state and hover peek state.
 * Persists user preference in localStorage.
 */
export function usePatientSidebarState() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(PATIENT_SIDEBAR_STORAGE_KEY) === "true";
  });

  const [isHovered, setIsHovered] = useState(false);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PATIENT_SIDEBAR_STORAGE_KEY, String(next));
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
