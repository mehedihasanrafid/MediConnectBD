/**
 * Patient appointment list showing upcoming and past visits with status and fee. Cancellation and
 * rescheduling are not implemented in the backend yet, so no action buttons are shown.
 */

import { useEffect, useState } from "react";
import { api } from "../../shared/api";
import type { Appointment } from "../../shared/types";
import { formatDhakaDateTime, formatMoney, formatStatus } from "../../shared/format";
import { Alert, Badge, Card, EmptyState, Spinner } from "../../components/ui";

function statusTone(status: string): string {
  if (status === "CONFIRMED" || status === "COMPLETED") return "success";
  if (status === "PENDING_PAYMENT") return "warning";
  if (status === "CANCELLED" || status === "PAYMENT_EXPIRED") return "danger";
  return "neutral";
}

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<{ items: Appointment[] }>("/appointments/me")
      .then((result) => setAppointments(result.items))
      .catch(() => setError("Could not load your appointments."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading appointments…" />;

  const now = Date.now();
  const upcoming = appointments.filter((a) => new Date(a.scheduledStartAt).getTime() >= now);
  const past = appointments.filter((a) => new Date(a.scheduledStartAt).getTime() < now);

  return (
    <div className="page">
      <header className="page-header">
        <h1>My appointments</h1>
        <p className="muted">All times are shown in Bangladesh time.</p>
      </header>

      {error && <Alert kind="error">{error}</Alert>}

      <h2>Upcoming ({upcoming.length})</h2>
      {upcoming.length === 0 && <EmptyState>No upcoming appointments.</EmptyState>}
      {upcoming.map((appointment) => (
        <AppointmentCard key={appointment.id} appointment={appointment} />
      ))}

      <h2>Past ({past.length})</h2>
      {past.length === 0 && <EmptyState>No past appointments.</EmptyState>}
      {past.map((appointment) => (
        <AppointmentCard key={appointment.id} appointment={appointment} />
      ))}
    </div>
  );
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  return (
    <Card>
      <div className="row space-between">
        <div>
          <h3>{formatDhakaDateTime(appointment.scheduledStartAt)}</h3>
          <p className="muted small">
            {appointment.mode} consultation · {formatMoney(appointment.feeAmount)}
          </p>
        </div>
        <Badge tone={statusTone(appointment.status)}>{formatStatus(appointment.status)}</Badge>
      </div>
      {appointment.paymentRequired && appointment.status === "PENDING_PAYMENT" && (
        <Alert kind="info">Payment is required to confirm this video consultation.</Alert>
      )}
      {appointment.cancellationReason && (
        <p className="muted small">Reason: {appointment.cancellationReason}</p>
      )}
    </Card>
  );
}
