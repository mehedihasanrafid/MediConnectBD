import { PortalHeader, type PortalHeaderProps } from "../../../shared/navigation/PortalHeader/PortalHeader";

export function DoctorHeader(props: Omit<PortalHeaderProps, "role">) {
  return <PortalHeader role="DOCTOR" {...props} />;
}
