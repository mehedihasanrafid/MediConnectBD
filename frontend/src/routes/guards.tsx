/**
 * Route guard layout wrappers using <Outlet />.
 * These control UI visibility and navigation only. Backend authorization still enforces permissions.
 */

import { Navigate, Outlet } from "react-router-dom";
import { Spinner } from "../components/ui";
import { useAuth } from "../features/auth/AuthContext";
import { defaultHomePathFor, hasAnyRole } from "../shared/utils/roles";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Checking session…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RoleRoute({ roles }: { roles: readonly string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Checking session…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasAnyRole(user, roles)) {
    return <Navigate to={defaultHomePathFor(user)} replace />;
  }
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Checking session…" />;
  if (user) return <Navigate to={defaultHomePathFor(user)} replace />;
  return <Outlet />;
}
