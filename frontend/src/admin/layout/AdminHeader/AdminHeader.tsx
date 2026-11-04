import { PortalHeader, type PortalHeaderProps } from "../../../shared/navigation/PortalHeader/PortalHeader";

export function AdminHeader(props: Omit<PortalHeaderProps, "role">) {
  return <PortalHeader role="ADMIN" {...props} />;
}
