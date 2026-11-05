/**
 * Route guard layout wrappers using <Outlet />.
 * These control UI visibility and navigation only. Backend authorization still enforces permissions.
 */

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { Alert, Button, Spinner } from "../shared/ui";
import { defaultHomePathFor, hasAnyRole } from "../shared/utils/roles";

function SessionUnavailable({ message }: { message: string }) {
  return <main>
    <Alert kind="error">{message}</Alert>
    <Button onClick={() => window.location.reload()}>Retry connection</Button>
  </main>;
}

export function ProtectedRoute() {
  const { user, loading, sessionError } = useAuth();
  if (loading) return <Spinner label="Checking session…" />;
  if (sessionError) return <SessionUnavailable message={sessionError} />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RoleRoute({ roles }: { roles: readonly string[] }) {
  const { user, loading, sessionError } = useAuth();
  if (loading) return <Spinner label="Checking session…" />;
  if (sessionError) return <SessionUnavailable message={sessionError} />;
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
