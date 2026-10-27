import type { LucideIcon } from "lucide-react";

/** One destination in the administrator navigation. */
export interface AdminSidebarItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match only this exact URL instead of matching its nested URLs. */
  exact?: boolean;
  children?: AdminSidebarItem[];
}

/** A labelled group such as Clinical Governance or Operations. */
export interface AdminSidebarSection {
  id: string;
  label?: string;
  items: AdminSidebarItem[];
}
