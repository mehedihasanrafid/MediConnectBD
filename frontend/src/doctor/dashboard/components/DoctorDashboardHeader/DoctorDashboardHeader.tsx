import { CalendarCheck, ClipboardList } from "lucide-react";
import { ButtonLink, PageHeader } from "../../../../shared/ui";

interface DoctorDashboardHeaderProps {
  bmdcNumber: string;
}

/**
 * Doctor dashboard header with BMDC badge and quick links to the appointment queue and prescriptions.
 */
export function DoctorDashboardHeader({ bmdcNumber }: DoctorDashboardHeaderProps) {
  return (
    <PageHeader
      eyebrow="Clinical Workspace"
      title="Doctor dashboard"
      description={`BMDC ${bmdcNumber}`}
      actions={
        <>
          <ButtonLink
            to="/doctor/appointments"
            variant="primary"
            leftIcon={<CalendarCheck size={17} />}
          >
            Patient appointment queue
          </ButtonLink>
          <ButtonLink
            to="/doctor/prescriptions"
            variant="secondary"
            leftIcon={<ClipboardList size={17} />}
          >
            Issued prescriptions
          </ButtonLink>
        </>
      }
    />
  );
}
