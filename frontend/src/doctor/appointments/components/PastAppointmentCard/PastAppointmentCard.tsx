import { useState } from "react";

import { prescriptionsApi } from "../../../../api/prescriptions";
import { Badge, Button, ButtonLink, Card, Cluster, Text } from "../../../../shared/ui";
import type { DoctorAppointment, Prescription } from "../../../../shared/types";
import { formatDhakaDateTime, formatMoney, formatStatus } from "../../../../shared/utils/format";
import { PrescriptionEditorForm } from "../../../prescriptions/components/PrescriptionEditorForm";
import { appointmentStatusTone } from "../../utils/statusTone";
import styles from "./PastAppointmentCard.module.css";

interface PastAppointmentCardProps {
  appt: DoctorAppointment;
  existingRx?: Prescription;
  onPrescriptionCreated: (appointmentId: string, created: Prescription) => void;
}

/**
 * Renders one completed or past appointment in the doctor's queue, including inline Rx authoring.
 */
export function PastAppointmentCard({
  appt,
  existingRx,
  onPrescriptionCreated,
}: PastAppointmentCardProps) {
  const [writingRx, setWritingRx] = useState(false);

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>
            {appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : "Patient visit"}
          </h3>
          <Text tone="muted" size="sm">
            {formatDhakaDateTime(appt.scheduledStartAt)} · {appt.mode} ·{" "}
            {formatMoney(appt.feeAmount)}
          </Text>
        </div>
        <Badge tone={appointmentStatusTone(appt.status)}>{formatStatus(appt.status)}</Badge>
      </div>

      {appt.status === "COMPLETED" && (
        <div className={styles.rxSection}>
          {existingRx ? (
            <Cluster gap={2}>
              <Badge tone="info">Prescription issued · {existingRx.verificationCode}</Badge>
              <ButtonLink variant="secondary" to="/doctor/prescriptions">
                View / Edit prescription
              </ButtonLink>
            </Cluster>
          ) : writingRx ? (
            <PrescriptionEditorForm
              submitLabel="Issue prescription"
              onCancel={() => setWritingRx(false)}
              onSubmit={async (values) => {
                const created = await prescriptionsApi.create({
                  appointmentId: appt.id,
                  ...values,
                });
                setWritingRx(false);
                onPrescriptionCreated(appt.id, created);
              }}
            />
          ) : (
            <Button onClick={() => setWritingRx(true)}>Issue prescription</Button>
          )}
        </div>
      )}
    </Card>
  );
}
