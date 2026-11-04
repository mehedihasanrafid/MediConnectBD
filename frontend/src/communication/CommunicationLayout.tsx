import { Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { DoctorLayout } from "../layouts/DoctorLayout";
import { PatientLayout } from "../layouts/PatientLayout";
import { AdminLayout } from "../layouts/AdminLayout";
import { isDoctor } from "../shared/utils/roles";

/** Keep the shared messaging route inside the signed-in user's portal shell. */
export function CommunicationLayout() {
  const { user } = useAuth();
  return user?.roles.includes("ADMIN") ? <AdminLayout /> : isDoctor(user) ? <DoctorLayout /> : <PatientLayout />;
}

export function CommunicationRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.roles.includes("ADMIN") ? "/admin/communication" : isDoctor(user) ? "/doctor/communication" : "/patient/communication"} replace />;
}
