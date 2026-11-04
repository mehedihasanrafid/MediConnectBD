import {
  Activity, Bell, Building2, CalendarCheck, ClipboardList, FileCheck2,
  FileSpreadsheet, Heart, LayoutDashboard, MessageSquare, Settings,
  ShieldCheck, Stethoscope, User, Users, Wallet,
} from "lucide-react";
import type { PublicUser } from "../../types";

export type PortalRole = "DOCTOR" | "PATIENT" | "ADMIN";
export const publicLinks = [
  { to: "/", label: "Home" },
  { to: "/doctors", label: "Find a doctor" },
  { to: "/verify-prescription", label: "Verify prescription" },
];

export function portalRoleFor(user: PublicUser): PortalRole | null {
  if (user.roles.includes("ADMIN")) return "ADMIN";
  if (user.roles.includes("DOCTOR")) return "DOCTOR";
  return user.roles.includes("PATIENT") ? "PATIENT" : null;
}

export const portalConfigs = {
  DOCTOR: {
    label: "Doctor", portal: "Doctor Portal", home: "/doctor", icon: Stethoscope,
    links: [
      { to: "/doctor", label: "Today's Overview", icon: Stethoscope },
      { to: "/doctor/appointments", label: "Appointment Queue", icon: CalendarCheck },
      { to: "/doctor/communication", label: "Consultation Messages", icon: MessageSquare },
      { to: "/doctor/prescriptions", label: "Prescriptions", icon: ClipboardList },
      { to: "/doctor/profile", label: "Profile Details", icon: User },
      { to: "/doctor/earnings", label: "Earnings & Revenue", icon: Wallet },
      { to: "/doctor/settings", label: "Account Settings", icon: Settings },
      { to: "/doctor/notifications", label: "Notification Center", icon: Bell },
    ],
  },
  PATIENT: {
    label: "Patient", portal: "Patient Portal", home: "/appointments", icon: Heart,
    links: [
      { to: "/doctors", label: "Find Doctors", icon: Stethoscope },
      { to: "/appointments", label: "My Appointments", icon: CalendarCheck },
      { to: "/prescriptions", label: "My Prescriptions", icon: ClipboardList },
      { to: "/reports", label: "Medical Reports", icon: FileSpreadsheet },
      { to: "/family-members", label: "Family Circle", icon: Users },
      { to: "/patient/communication", label: "Consultation Messages", icon: MessageSquare },
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/verify-prescription", label: "Verify Rx", icon: ShieldCheck },
    ],
  },
  ADMIN: {
    label: "Admin", portal: "Admin Console", home: "/admin/overview", icon: ShieldCheck,
    links: [
      { to: "/admin/overview", label: "Overview", icon: LayoutDashboard },
      { to: "/admin/applications", label: "Doctor Applications", icon: FileCheck2 },
      { to: "/admin/catalog", label: "Medical Catalog", icon: Building2 },
      { to: "/admin/users", label: "User Directory", icon: Users },
      { to: "/admin/operations", label: "Bookings & Refunds", icon: Activity },
      { to: "/admin/notifications", label: "Notification Center", icon: Bell },
      { to: "/admin/communication", label: "Messages & Support", icon: MessageSquare },
      { to: "/doctors", label: "Public Directory", icon: Stethoscope },
      { to: "/verify-prescription", label: "Verify Rx", icon: ShieldCheck },
    ],
  },
};
