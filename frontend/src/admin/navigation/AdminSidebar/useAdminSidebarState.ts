import { useState } from "react";

const SIDEBAR_STORAGE_KEY = "mediconnectbd.admin.sidebar.collapsed";

/**
 * Owns the administrator's expanded/collapsed sidebar preference.
 * The lazy initializer reads localStorage only once when the layout mounts.
 */
export function useAdminSidebarState() {
  const [collapsed, setCollapsed] = useState(() => (
    typeof window !== "undefined"
      && window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true"
  ));

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  return { collapsed, toggle };
}
