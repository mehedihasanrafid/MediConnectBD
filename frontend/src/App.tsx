/**
 * Application shell: navigation, route table, and auth-aware links. Public routes are reachable
 * without a session; protected routes redirect to the login page.
 */

import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./features/auth/AuthContext";
import { LoginPage } from "./features/auth/LoginPage";
import { DoctorSearchPage } from "./features/doctors/DoctorSearchPage";
import { DoctorDetailPage } from "./features/doctors/DoctorDetailPage";
import { AppointmentsPage } from "./features/appointments/AppointmentsPage";
import { FamilyMembersPage } from "./features/patient/FamilyMembersPage";
import { DoctorDashboardPage } from "./features/doctor/DoctorDashboardPage";
import { AdminApplicationsPage } from "./features/admin/AdminApplicationsPage";
import { Button, Spinner } from "./components/ui";

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Checking session…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.some((role) => user.roles.includes(role))) {
    return <Navigate to="/doctors" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isPatient = user?.roles.includes("PATIENT");
  const isDoctor = user?.roles.includes("DOCTOR");
  const isAdmin = user?.roles.includes("ADMIN");

  return (
    <div className="app">
      <nav className="nav">
        <Link to="/doctors" className="brand">
          MediConnect BD
        </Link>
        <div className="nav-links">
          <Link to="/doctors">Find a doctor</Link>
          {isPatient && <Link to="/appointments">My appointments</Link>}
          {isPatient && <Link to="/family-members">Family members</Link>}
          {isDoctor && <Link to="/doctor">Doctor dashboard</Link>}
          {isAdmin && <Link to="/admin/applications">Applications</Link>}
        </div>
        <div className="nav-user">
          {user ? (
            <>
              <span className="muted small">
                {user.firstName} {user.lastName} · {user.roles.join(", ")}
              </span>
              <Button
                variant="secondary"
                onClick={() => {
                  void logout().then(() => navigate("/login"));
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Link className="btn btn-primary" to="/login">
              Sign in
            </Link>
          )}
        </div>
      </nav>

      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/doctors" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/doctors" element={<DoctorSearchPage />} />
          <Route path="/doctors/:doctorId" element={<DoctorDetailPage />} />
          <Route
            path="/appointments"
            element={
              <RequireAuth roles={["PATIENT"]}>
                <AppointmentsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/family-members"
            element={
              <RequireAuth roles={["PATIENT"]}>
                <FamilyMembersPage />
              </RequireAuth>
            }
          />
          <Route
            path="/doctor"
            element={
              <RequireAuth roles={["DOCTOR"]}>
                <DoctorDashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <RequireAuth roles={["ADMIN"]}>
                <AdminApplicationsPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/doctors" replace />} />
        </Routes>
      </main>
    </div>
  );
}
