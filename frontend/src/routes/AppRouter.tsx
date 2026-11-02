/**
 * Central route table for MediConnect BD, organized by role domain (admin, doctor, patient, public)
 * following DokanBD's modular frontend structure.
 */

import { Navigate, Route, Routes } from "react-router-dom";
import { AdminApplicationsPage } from "../admin/applications";
import { AdminCatalogPage } from "../admin/catalog";
import { AdminOverviewPage } from "../admin/dashboard";
import { AdminOperationsPage } from "../admin/operations";
import { AdminUsersPage } from "../admin/users";
import { DoctorAppointmentsPage } from "../doctor/appointments";
import { DoctorConsultationPage } from "../doctor/consultations";
import { DoctorDashboardPage } from "../doctor/dashboard";
import { DoctorEarningsPage } from "../doctor/earnings";
import { DoctorPrescriptionsPage } from "../doctor/prescriptions";
import { DoctorProfilePage } from "../doctor/profile";
import { DoctorSchedulePage } from "../doctor/schedule";
import { DoctorSettingsPage } from "../doctor/settings";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { AdminLayout } from "../layouts/AdminLayout";
import { DoctorLayout } from "../layouts/DoctorLayout";
import { MainLayout } from "../layouts/MainLayout";
import { AppointmentsPage } from "../patient/appointments";
import { FamilyMembersPage } from "../patient/family-members";
import { PatientPrescriptionsPage } from "../patient/prescriptions";
import { MedicalReportsPage } from "../patient/reports";
import { DoctorDetailPage, DoctorSearchPage } from "../public/doctors";
import { HomePage } from "../public/home";
import { NotFoundPage } from "../public/not-found";
import { VerifyPrescriptionPage } from "../public/verify-prescription";
import { CommunicationPage } from "../communication";
import { NotificationsPage } from "../notifications";
import { RoleRoute } from "./guards";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/doctors" element={<DoctorSearchPage />} />
        <Route path="/doctors/:doctorId" element={<DoctorDetailPage />} />
        <Route path="/verify-prescription" element={<VerifyPrescriptionPage />} />

        <Route element={<RoleRoute roles={["PATIENT", "DOCTOR"]} />}>
          <Route path="/communication" element={<CommunicationPage />} />
          <Route path="/messages" element={<Navigate to="/communication" replace />} />
        </Route>

        <Route element={<RoleRoute roles={["PATIENT", "DOCTOR", "ADMIN"]} />}>
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>

        <Route element={<RoleRoute roles={["PATIENT"]} />}>
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/prescriptions" element={<PatientPrescriptionsPage />} />
          <Route path="/reports" element={<MedicalReportsPage />} />
          <Route path="/family-members" element={<FamilyMembersPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/doctor" element={<RoleRoute roles={["DOCTOR"]} />}>
        <Route element={<DoctorLayout />}>
          <Route index element={<DoctorDashboardPage />} />
          <Route path="appointments" element={<DoctorAppointmentsPage />} />
          <Route path="consultations/:appointmentId" element={<DoctorConsultationPage />} />
          <Route path="prescriptions" element={<DoctorPrescriptionsPage />} />
          <Route path="profile" element={<DoctorProfilePage />} />
          <Route path="schedule" element={<DoctorSchedulePage />} />
          <Route path="earnings" element={<DoctorEarningsPage />} />
          <Route path="settings" element={<DoctorSettingsPage />} />
        </Route>
      </Route>

      <Route path="/admin" element={<RoleRoute roles={["ADMIN"]} />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<AdminOverviewPage />} />
          <Route path="applications" element={<AdminApplicationsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="catalog" element={<AdminCatalogPage />} />
          <Route path="operations" element={<AdminOperationsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
