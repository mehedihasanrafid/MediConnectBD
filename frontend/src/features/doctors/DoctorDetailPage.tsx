/**
 * Doctor profile with the next seven days of availability. Selecting a slot creates a ten-minute
 * hold; the patient then confirms the booking. Video bookings require payment afterwards.
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiRequestError } from "../../shared/api";
import type {
  Appointment,
  AvailabilityResponse,
  AvailabilitySlot,
  PublicDoctor,
  SlotHold,
} from "../../shared/types";
import { formatDhakaDate, formatDhakaTime, formatMoney } from "../../shared/format";
import { Alert, Badge, Button, Card, EmptyState, Spinner } from "../../components/ui";
import { useAuth } from "../auth/AuthContext";

export function DoctorDetailPage() {
  const { doctorId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doctor, setDoctor] = useState<PublicDoctor | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hold, setHold] = useState<SlotHold | null>(null);
  const [booking, setBooking] = useState<Appointment | null>(null);
  const [busySlotId, setBusySlotId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void Promise.all([
      api.get<PublicDoctor>(`/doctors/${doctorId}`),
      api.get<AvailabilityResponse>(`/doctors/${doctorId}/availability?days=7`),
    ])
      .then(([profile, slots]) => {
        setDoctor(profile);
        setAvailability(slots);
      })
      .catch(() => setError("Could not load this doctor's availability."))
      .finally(() => setLoading(false));
  }, [doctorId]);

  async function handleHold(slot: AvailabilitySlot) {
    if (!user) {
      navigate("/login");
      return;
    }
    setBusySlotId(slot.id);
    setError(null);
    try {
      const created = await api.post<SlotHold>("/appointments/holds", { slotId: slot.id });
      setHold(created);
      setBooking(null);
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Could not hold this slot.");
    } finally {
      setBusySlotId(null);
    }
  }

  async function handleBook() {
    if (!hold) return;
    setError(null);
    try {
      const appointment = await api.post<Appointment>("/appointments", { holdId: hold.id });
      setBooking(appointment);
      setHold(null);
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Could not confirm booking.");
    }
  }

  async function handleRelease() {
    if (!hold) return;
    try {
      await api.delete(`/appointments/holds/${hold.id}`);
    } finally {
      setHold(null);
    }
  }

  if (loading) return <Spinner label="Loading doctor…" />;
  if (!doctor) return <Alert kind="error">{error ?? "Doctor not found."}</Alert>;

  const grouped = new Map<string, AvailabilitySlot[]>();
  for (const slot of availability?.items ?? []) {
    const day = slot.startAt.slice(0, 10);
    grouped.set(day, [...(grouped.get(day) ?? []), slot]);
  }

  return (
    <div className="page">
      <Card>
        <div className="doctor-head">
          <div className="avatar large">
            {doctor.firstName[0]}
            {doctor.lastName[0]}
          </div>
          <div>
            <h1>
              Dr. {doctor.firstName} {doctor.lastName}
            </h1>
            <p className="muted">{doctor.specialties.map((s) => s.name).join(", ")}</p>
            <p className="muted small">
              {doctor.degrees ?? "—"} · {doctor.experienceYears} years experience
            </p>
          </div>
        </div>
        {doctor.bio && <p>{doctor.bio}</p>}
        <dl className="facts">
          <div>
            <dt>Video consultation</dt>
            <dd>{formatMoney(doctor.videoConsultationFee)}</dd>
          </div>
          <div>
            <dt>Languages</dt>
            <dd>{doctor.languages?.join(", ") ?? "—"}</dd>
          </div>
        </dl>
        {doctor.chambers.map((chamber) => (
          <p key={chamber.id} className="muted small">
            {chamber.hospital.name}, {chamber.hospital.area} — {formatMoney(chamber.consultationFee)}
          </p>
        ))}
      </Card>

      {error && <Alert kind="error">{error}</Alert>}

      {hold && (
        <Card className="hold-banner">
          <Alert kind="info">
            Slot held until {formatDhakaTime(hold.expiresAt)} (Bangladesh time). Confirm before it
            expires.
          </Alert>
          <div className="row">
            <Button onClick={handleBook}>Confirm booking</Button>
            <Button variant="secondary" onClick={handleRelease}>
              Release hold
            </Button>
          </div>
        </Card>
      )}

      {booking && (
        <Card>
          <Alert kind="success">
            Appointment created — status {booking.status.replaceAll("_", " ")}.
            {booking.paymentRequired && " Payment is required to confirm this video consultation."}
          </Alert>
          <Button variant="secondary" onClick={() => navigate("/appointments")}>
            View my appointments
          </Button>
        </Card>
      )}

      <h2>Available slots (next 7 days)</h2>
      {grouped.size === 0 && <EmptyState>No slots are currently available.</EmptyState>}

      {[...grouped.entries()].map(([day, slots]) => (
        <Card key={day}>
          <h3>{formatDhakaDate(`${day}T00:00:00.000Z`)}</h3>
          <div className="slot-grid">
            {slots.map((slot) => (
              <button
                key={slot.id}
                className="slot"
                disabled={busySlotId === slot.id || hold !== null}
                onClick={() => void handleHold(slot)}
              >
                <span>{formatDhakaTime(slot.startAt)}</span>
                <Badge tone={slot.mode === "VIDEO" ? "info" : "neutral"}>{slot.mode}</Badge>
                <span className="muted small">{formatMoney(slot.feeAmount)}</span>
              </button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
