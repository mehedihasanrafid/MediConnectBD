import { useState } from "react";

import { Badge, Button, Card } from "../../../../components/ui";
import { VideoSessionPanel } from "../../../../patient/appointments/components/VideoSessionPanel";
import type { DoctorAppointment } from "../../../../shared/types";
import { formatDhakaDateTime, formatMoney, formatStatus } from "../../../../shared/utils/format";
import { PatientHistoryPanel } from "../../../dashboard/components/PatientHistoryPanel";
import { appointmentStatusTone } from "../../utils/statusTone";
import styles from "./ActiveAppointmentCard.module.css";

interface ActiveAppointmentCardProps {
  appt: DoctorAppointment;
  busy: boolean;
  onTransition: (appointmentId: string, action: "complete" | "no-show" | "cancel") => Promise<void>;
}

/**
 * Renders one active (CONFIRMED or PENDING_PAYMENT) consultation in the doctor's queue.
 */
export function ActiveAppointmentCard({
  appt,
  busy,
  onTransition,
}: ActiveAppointmentCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>
            {appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : "Patient visit"}
          </h3>
          <p className="muted small">
            {formatDhakaDateTime(appt.scheduledStartAt)} · {appt.mode} ·{" "}
            {formatMoney(appt.feeAmount)}
            {appt.familyMember
              ? ` · Family member: ${appt.familyMember.name} (${appt.familyMember.relationship})`
              : ""}
          </p>
          {appt.patient && (
            <p className="muted small">
              {appt.patient.email}
              {appt.patient.phone ? ` · ${appt.patient.phone}` : ""}
            </p>
          )}
        </div>
        <Badge tone={appointmentStatusTone(appt.status)}>{formatStatus(appt.status)}</Badge>
      </div>

      <div className={`row ${styles.actions}`}>
        <Button variant="secondary" onClick={() => setShowHistory((current) => !current)}>
          {showHistory ? "Hide patient history" : "Patient history & reports"}
        </Button>
        {appt.status === "CONFIRMED" && appt.mode === "VIDEO" && (
          <Button variant="secondary" onClick={() => setShowVideo((current) => !current)}>
            {showVideo ? "Hide video room" : "Join video call"}
          </Button>
        )}
        {appt.status === "CONFIRMED" && (
          <>
            <Button disabled={busy} onClick={() => void onTransition(appt.id, "complete")}>
              Mark completed
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void onTransition(appt.id, "no-show")}
            >
              Mark no-show
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => void onTransition(appt.id, "cancel")}
            >
              Cancel visit
            </Button>
          </>
        )}
      </div>

      {showVideo && (
        <VideoSessionPanel appointmentId={appt.id} onClose={() => setShowVideo(false)} />
      )}

      {showHistory && appt.patient && (
        <PatientHistoryPanel
          patientProfileId={appt.patient.id}
          onClose={() => setShowHistory(false)}
        />
      )}
    </Card>
  );
}
