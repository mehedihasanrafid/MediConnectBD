/**
 * Central route table for MediConnect BD.
 */

import { Navigate, Route, Routes } from "react-router-dom";
import { AdminApplicationsPage } from "../features/admin/AdminApplicationsPage";
import { AdminCatalogPage } from "../features/admin/AdminCatalogPage";
import { AdminOperationsPage } from "../features/admin/AdminOperationsPage";
import { AdminOverviewPage } from "../features/admin/AdminOverviewPage";
import { AdminUsersPage } from "../features/admin/AdminUsersPage";
import { AppointmentsPage } from "../features/appointments/AppointmentsPage";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { DoctorAppointmentsPage } from "../features/doctor/DoctorAppointmentsPage";
import { DoctorDashboardPage } from "../features/doctor/DoctorDashboardPage";
import { DoctorPrescriptionsPage } from "../features/doctor/DoctorPrescriptionsPage";
import { DoctorDetailPage } from "../features/doctors/DoctorDetailPage";
import { DoctorSearchPage } from "../features/doctors/DoctorSearchPage";
import { FamilyMembersPage } from "../features/patient/FamilyMembersPage";
import { PatientPrescriptionsPage } from "../features/prescriptions/PatientPrescriptionsPage";
import { VerifyPrescriptionPage } from "../features/prescriptions/VerifyPrescriptionPage";
import { AdminLayout } from "../layouts/AdminLayout";
import { MainLayout } from "../layouts/MainLayout";
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

        <Route element={<RoleRoute roles={["PATIENT"]} />}>
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/prescriptions" element={<PatientPrescriptionsPage />} />
          <Route path="/family-members" element={<FamilyMembersPage />} />
        </Route>

        <Route element={<RoleRoute roles={["DOCTOR"]} />}>
          <Route path="/doctor" element={<DoctorDashboardPage />} />
          <Route path="/doctor/appointments" element={<DoctorAppointmentsPage />} />
          <Route path="/doctor/prescriptions" element={<DoctorPrescriptionsPage />} />
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

      <Route path="*" element={<Navigate to="/doctors" replace />} />
    </Routes>
  );
}
