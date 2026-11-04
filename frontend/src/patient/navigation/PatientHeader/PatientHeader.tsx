import { PortalHeader, type PortalHeaderProps } from "../../../shared/navigation/PortalHeader/PortalHeader";

export function PatientHeader(props: Omit<PortalHeaderProps, "role">) {
  return <PortalHeader role="PATIENT" {...props} />;
}
