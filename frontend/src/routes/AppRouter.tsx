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
import { DoctorDashboardPage } from "../doctor/dashboard";
import { DoctorPrescriptionsPage } from "../doctor/prescriptions";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { AdminLayout } from "../layouts/AdminLayout";
import { MainLayout } from "../layouts/MainLayout";
import { AppointmentsPage } from "../patient/appointments";
import { FamilyMembersPage } from "../patient/family-members";
import { PatientPrescriptionsPage } from "../patient/prescriptions";
import { MedicalReportsPage } from "../patient/reports";
import { DoctorDetailPage, DoctorSearchPage } from "../public/doctors";
import { NotFoundPage } from "../public/not-found";
import { VerifyPrescriptionPage } from "../public/verify-prescription";
import { CommunicationPage } from "../communication";
import { RoleRoute } from "./guards";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/doctors" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/doctors" element={<DoctorSearchPage />} />
        <Route path="/doctors/:doctorId" element={<DoctorDetailPage />} />
        <Route path="/verify-prescription" element={<VerifyPrescriptionPage />} />

        <Route element={<RoleRoute roles={["PATIENT", "DOCTOR"]} />}>
          <Route path="/communication" element={<CommunicationPage />} />
          <Route path="/messages" element={<Navigate to="/communication" replace />} />
        </Route>

        <Route element={<RoleRoute roles={["PATIENT"]} />}>
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/prescriptions" element={<PatientPrescriptionsPage />} />
          <Route path="/reports" element={<MedicalReportsPage />} />
          <Route path="/family-members" element={<FamilyMembersPage />} />
        </Route>

        <Route element={<RoleRoute roles={["DOCTOR"]} />}>
          <Route path="/doctor" element={<DoctorDashboardPage />} />
          <Route path="/doctor/appointments" element={<DoctorAppointmentsPage />} />
          <Route path="/doctor/prescriptions" element={<DoctorPrescriptionsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
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
