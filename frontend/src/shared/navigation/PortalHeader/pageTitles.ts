const titles: Record<string, string> = {
  "/": "Home",
  "/login": "Sign in",
  "/register": "Create an account",
  "/verify-prescription": "Verify Prescription",
  "/appointments": "My Appointments & Telehealth",
  "/prescriptions": "My Digital Prescriptions",
  "/reports": "Medical & Lab Reports",
  "/family-members": "Family Circle & Dependents",
  "/notifications": "Notification Center",
  "/communication": "Consultation Messages",
  "/messages": "Consultation Messages",
  "/patient/communication": "Doctor Consultation Hub",
  "/doctor/communication": "Consultation Messages",
  "/doctor/appointments": "Patient Appointment Queue",
  "/doctor/prescriptions": "Digital Prescriptions",
  "/doctor/profile": "Doctor Profile & Chambers",
  "/doctor/schedule": "Doctor Schedule & Working Hours",
  "/doctor/earnings": "Earnings & Practice Performance",
  "/doctor/settings": "Doctor Account Settings",
  "/doctor/notifications": "Notification Center",
  "/admin/overview": "Operational Overview",
  "/admin/applications": "Doctor License Applications",
  "/admin/catalog": "Medical Specialties & Chambers Catalog",
  "/admin/users": "User Directory & Access Control",
  "/admin/operations": "Bookings, Transactions & Refunds",
  "/admin/notifications": "Notification Center",
  "/admin/communication": "Messages & Support",
};

export function headerPageTitle(pathname: string, search = ""): string {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/doctor") {
    const tab = new URLSearchParams(search).get("tab");
    if (tab === "schedule") return "Weekly Schedule & Chambers";
    if (tab === "profile") return "Doctor Profile & Qualifications";
    if (tab === "earnings" || tab === "analytics") return "Practice Analytics & Revenue";
    return "Today's Clinical Overview";
  }
  if (path.startsWith("/doctor/consultations/")) return "Clinical Consultation Workspace";
  if (path === "/doctors") return "Find a Doctor & Book Slot";
  if (path.startsWith("/doctors/")) return "Doctor Profile & Booking";
  if (path.startsWith("/patient/")) return titles[path] ?? titles[path.slice(8)] ?? "Patient Portal";
  return titles[path] ?? "MediConnect BD";
}

export function isPublicPage(pathname: string): boolean {
  return !/^\/(doctor(?:\/|$)|admin(?:\/|$)|patient(?:\/|$)|appointments(?:\/|$)|prescriptions(?:\/|$)|reports(?:\/|$)|family-members(?:\/|$)|notifications(?:\/|$)|communication(?:\/|$)|messages(?:\/|$))/.test(pathname);
}
