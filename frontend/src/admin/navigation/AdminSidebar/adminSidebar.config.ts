import {
  Activity,
  Building2,
  FileCheck2,
  LayoutDashboard,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

import type { AdminSidebarSection } from "./adminSidebar.types";

/**
 * Single source of truth for MediConnect BD admin navigation.
 * Add or reorder sidebar links here, then register the same route in AppRouter.
 */
export const adminSidebarSections: AdminSidebarSection[] = [
  {
    id: "overview",
    items: [
      { to: "/admin/overview", label: "Overview", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    id: "clinical",
    label: "Clinical Governance",
    items: [
      { to: "/admin/applications", label: "Doctor applications", icon: FileCheck2 },
      { to: "/admin/catalog", label: "Catalog", icon: Building2 },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/operations", label: "Bookings & Refunds", icon: Activity },
    ],
  },
  {
    id: "public-portal",
    label: "Public Portal",
    items: [
      { to: "/doctors", label: "Public directory", icon: Stethoscope },
      { to: "/verify-prescription", label: "Verify Rx", icon: ShieldCheck },
    ],
  },
];
