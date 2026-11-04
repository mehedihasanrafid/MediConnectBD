import { useState } from "react";

const SIDEBAR_STORAGE_KEY = "mediconnectbd.admin.sidebar.collapsed";

/**
 * Owns the administrator's expanded/collapsed sidebar preference.
 * The lazy initializer reads localStorage only once when the layout mounts.
 */
export function useAdminSidebarState() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  });

  const [isHovered, setIsHovered] = useState(false);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
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
