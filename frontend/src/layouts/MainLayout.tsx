/**
 * Main layout shell for public visitors, patients, and doctors.
 */

import { Link, Outlet, useNavigate } from "react-router-dom";
import { Button } from "../components/ui";
import { useAuth } from "../features/auth/AuthContext";
import { isAdmin, isDoctor, isPatient } from "../shared/utils/roles";

export function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app">
      <nav className="nav">
        <Link to="/doctors" className="brand">
          MediConnect BD
        </Link>
        <div className="nav-links">
          <Link to="/doctors">Find a doctor</Link>
          <Link to="/verify-prescription">Verify prescription</Link>
          {isPatient(user) && <Link to="/appointments">My appointments</Link>}
          {isPatient(user) && <Link to="/prescriptions">My prescriptions</Link>}
          {isPatient(user) && <Link to="/family-members">Family members</Link>}
          {isDoctor(user) && <Link to="/doctor">Dashboard</Link>}
          {isDoctor(user) && <Link to="/doctor/appointments">Appointment queue</Link>}
          {isDoctor(user) && <Link to="/doctor/prescriptions">Prescriptions</Link>}
          {isAdmin(user) && <Link to="/admin/overview">Admin console</Link>}
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
            <div className="row">
              <Link className="btn btn-secondary" to="/register">
                Register
              </Link>
              <Link className="btn btn-primary" to="/login">
                Sign in
              </Link>
            </div>
          )}
        </div>
      </nav>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
