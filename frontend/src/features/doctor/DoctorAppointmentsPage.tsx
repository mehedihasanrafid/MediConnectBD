/**
 * Doctor appointment queue page. Shows assigned patients, allows transitioning CONFIRMED
 * appointments to COMPLETED, NO_SHOW, or CANCELLED, and writing prescriptions for COMPLETED visits.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { appointmentsApi } from "../../api/appointments";
import { doctorsApi } from "../../api/doctors";
import { prescriptionsApi } from "../../api/prescriptions";
import { Alert, Badge, Button, Card, EmptyState, Spinner } from "../../components/ui";
import type { DoctorAppointment, Prescription } from "../../shared/types";
import { getErrorMessage } from "../../shared/utils/apiError";
import { formatDhakaDateTime, formatMoney, formatStatus } from "../../shared/utils/format";
import { PrescriptionEditorForm } from "./PrescriptionEditorForm";

function statusTone(status: string): string {
  if (status === "CONFIRMED" || status === "COMPLETED") return "success";
  if (status === "PENDING_PAYMENT") return "warning";
  if (status === "CANCELLED" || status === "PAYMENT_EXPIRED" || status === "NO_SHOW") return "danger";
  return "neutral";
}

export function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [prescriptionsByAppt, setPrescriptionsByAppt] = useState<Record<string, Prescription>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [writingForId, setWritingForId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const [apptsRes, rxRes] = await Promise.all([
        doctorsApi.listMyAppointments(),
        prescriptionsApi.listDoctorPrescriptions().catch(() => ({ items: [] as Prescription[] })),
      ]);
      setAppointments(apptsRes.items);
      const map: Record<string, Prescription> = {};
      for (const rx of rxRes.items) {
        map[rx.appointmentId] = rx;
      }
      setPrescriptionsByAppt(map);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not load your appointment queue."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  async function handleTransition(
    appointmentId: string,
    action: "complete" | "no-show" | "cancel",
  ) {
    setBusyId(appointmentId);
    setError(null);
    setNotice(null);
    try {
      if (action === "complete") {
        await appointmentsApi.completeAppointment(appointmentId);
        setNotice("Appointment marked as completed. You can now issue a prescription.");
      } else if (action === "no-show") {
        await appointmentsApi.markNoShow(appointmentId);
        setNotice("Appointment marked as no-show.");
      } else {
        await appointmentsApi.cancelAppointment(appointmentId, "Cancelled by doctor");
        setNotice("Appointment cancelled (100% patient refund policy applied if paid).");
      }
      await loadQueue();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not update appointment status."));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Spinner label="Loading patient queue…" />;

  const activeQueue = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "PENDING_PAYMENT",
  );
  const historyQueue = appointments.filter(
    (a) => a.status !== "CONFIRMED" && a.status !== "PENDING_PAYMENT",
  );

  return (
    <div className="page">
      <header className="page-header">
        <h1>Patient appointment queue</h1>
        <p className="muted">
          Manage consultations, mark attendance, and issue digital prescriptions.
        </p>
      </header>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <h2>Active queue ({activeQueue.length})</h2>
      {activeQueue.length === 0 && <EmptyState>No active appointments in your queue.</EmptyState>}
      {activeQueue.map((appt) => (
        <Card key={appt.id}>
          <div className="row space-between">
            <div>
              <h3>
                {appt.patient
                  ? `${appt.patient.firstName} ${appt.patient.lastName}`
                  : "Patient visit"}
              </h3>
              <p className="muted small">
                {formatDhakaDateTime(appt.scheduledStartAt)} · {appt.mode} ·{" "}
                {formatMoney(appt.feeAmount)}
              </p>
              {appt.patient && (
                <p className="muted small">
                  {appt.patient.email}
                  {appt.patient.phone ? ` · ${appt.patient.phone}` : ""}
                </p>
              )}
            </div>
            <Badge tone={statusTone(appt.status)}>{formatStatus(appt.status)}</Badge>
          </div>

          {appt.status === "CONFIRMED" && (
            <div className="row" style={{ marginTop: "0.75rem" }}>
              <Button
                disabled={busyId === appt.id}
                onClick={() => void handleTransition(appt.id, "complete")}
              >
                Mark completed
              </Button>
              <Button
                variant="secondary"
                disabled={busyId === appt.id}
                onClick={() => void handleTransition(appt.id, "no-show")}
              >
                Mark no-show
              </Button>
              <Button
                variant="danger"
                disabled={busyId === appt.id}
                onClick={() => void handleTransition(appt.id, "cancel")}
              >
                Cancel visit
              </Button>
            </div>
          )}
        </Card>
      ))}

      <h2>Completed & Past ({historyQueue.length})</h2>
      {historyQueue.length === 0 && <EmptyState>No past consultations yet.</EmptyState>}
      {historyQueue.map((appt) => {
        const existingRx = prescriptionsByAppt[appt.id];
        return (
          <Card key={appt.id}>
            <div className="row space-between">
              <div>
                <h3>
                  {appt.patient
                    ? `${appt.patient.firstName} ${appt.patient.lastName}`
                    : "Patient visit"}
                </h3>
                <p className="muted small">
                  {formatDhakaDateTime(appt.scheduledStartAt)} · {appt.mode} ·{" "}
                  {formatMoney(appt.feeAmount)}
                </p>
              </div>
              <Badge tone={statusTone(appt.status)}>{formatStatus(appt.status)}</Badge>
            </div>

            {appt.status === "COMPLETED" && (
              <div style={{ marginTop: "0.75rem" }}>
                {existingRx ? (
                  <div className="row">
                    <Badge tone="info">Prescription issued · {existingRx.verificationCode}</Badge>
                    <Link className="btn btn-secondary" to="/doctor/prescriptions">
                      View / Edit prescription
                    </Link>
                  </div>
                ) : writingForId === appt.id ? (
                  <PrescriptionEditorForm
                    submitLabel="Issue prescription"
                    onCancel={() => setWritingForId(null)}
                    onSubmit={async (values) => {
                      const created = await prescriptionsApi.create({
                        appointmentId: appt.id,
                        ...values,
                      });
                      setPrescriptionsByAppt((prev) => ({ ...prev, [appt.id]: created }));
                      setWritingForId(null);
                      setNotice(
                        `Prescription issued (verification code: ${created.verificationCode}).`,
                      );
                    }}
                  />
                ) : (
                  <Button onClick={() => setWritingForId(appt.id)}>Write prescription</Button>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
