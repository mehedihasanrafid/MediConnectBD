import { NavLink } from "react-router-dom";

import styles from "../AdminSidebar.module.css";
import type { AdminSidebarSection } from "../adminSidebar.types";

interface SidebarSectionProps {
  section: AdminSidebarSection;
  collapsed: boolean;
}

/**
 * Renders one grouped section of sidebar links inside the AdminSidebar.
 */
export function SidebarSection({ section, collapsed }: SidebarSectionProps) {
  return (
    <section className={styles.section}>
      {section.label && <div className={styles.sectionLabel}>{section.label}</div>}
      {section.items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `${styles.link}${isActive ? ` ${styles.active}` : ""}`
            }
          >
            <Icon size={18} aria-hidden="true" />
            <span className={styles.label}>{item.label}</span>
          </NavLink>
        );
      })}
    </section>
  );
}
