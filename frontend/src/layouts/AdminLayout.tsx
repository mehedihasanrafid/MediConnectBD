/**
 * Dedicated layout shell for the Admin console.
 */

import { Link, Outlet, useNavigate } from "react-router-dom";
import { Button } from "../components/ui";
import { useAuth } from "../features/auth/AuthContext";

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app">
      <nav className="nav nav-admin">
        <Link to="/admin/overview" className="brand">
          MediConnect BD · Admin
        </Link>
        <div className="nav-links">
          <Link to="/admin/overview">Overview</Link>
          <Link to="/admin/applications">Doctor applications</Link>
          <Link to="/admin/users">Users</Link>
          <Link to="/admin/catalog">Catalog</Link>
          <Link to="/admin/operations">Bookings & Refunds</Link>
          <Link to="/doctors">Public directory</Link>
        </div>
        <div className="nav-user">
          {user && (
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
          )}
        </div>
      </nav>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
