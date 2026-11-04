import { useAuth } from "../features/auth/AuthContext";
import { PublicHeader } from "../public/shell/PublicHeader";
import { PortalHeader } from "../shared/navigation/PortalHeader/PortalHeader";
import { portalRoleFor } from "../shared/navigation/PortalHeader/portalHeader.config";

/** Public content keeps the signed-in user's header and access to their portal. */
export function WebsiteHeader() {
  const { user, loading } = useAuth();
  if (loading) return <header aria-label="Loading navigation" style={{ minHeight: 60 }} />;
  const role = user ? portalRoleFor(user) : null;
  return role ? <PortalHeader role={role} publicPage /> : <PublicHeader />;
}
