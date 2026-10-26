/**
 * Doctor profile with the next seven days of availability and public patient reviews.
 * Selecting a slot creates a ten-minute hold; the patient then confirms the booking.
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { appointmentsApi } from "../../api/appointments";
import { doctorsApi } from "../../api/doctors";
import { reviewsApi } from "../../api/reviews";
import { Alert, Badge, Button, Card, EmptyState, Spinner } from "../../components/ui";
import type {
  Appointment,
  AvailabilityResponse,
  AvailabilitySlot,
  PublicDoctor,
  Review,
  SlotHold,
} from "../../shared/types";
import { getErrorMessage } from "../../shared/utils/apiError";
import { formatDhakaDate, formatDhakaTime, formatMoney } from "../../shared/utils/format";
import { isAdmin } from "../../shared/utils/roles";
import { useAuth } from "../auth/AuthContext";

function renderStars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
}

export function DoctorDetailPage() {
  const { doctorId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doctor, setDoctor] = useState<PublicDoctor | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hold, setHold] = useState<SlotHold | null>(null);
  const [booking, setBooking] = useState<Appointment | null>(null);
  const [busySlotId, setBusySlotId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      doctorsApi.getPublicProfile(doctorId),
      doctorsApi.getAvailability(doctorId, 7),
      reviewsApi.listDoctorReviews(doctorId).catch(() => ({ items: [] as Review[] })),
    ])
      .then(([profile, slots, reviewsRes]) => {
        if (cancelled) return;
        setDoctor(profile);
        setAvailability(slots);
        setReviews(reviewsRes.items);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this doctor's availability.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  async function handleHold(slot: AvailabilitySlot) {
    if (!user) {
      navigate("/login");
      return;
    }
    setBusySlotId(slot.id);
    setError(null);
    try {
      const created = await appointmentsApi.holdSlot(slot.id);
      setHold(created);
      setBooking(null);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not hold this slot."));
    } finally {
      setBusySlotId(null);
    }
  }

  async function handleBook() {
    if (!hold) return;
    setError(null);
    try {
      const appointment = await appointmentsApi.bookAppointment(hold.id);
      setBooking(appointment);
      setHold(null);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not confirm booking."));
    }
  }

  async function handleRelease() {
    if (!hold) return;
    try {
      await appointmentsApi.releaseHold(hold.id);
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

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

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
              {avgRating ? ` · ★ ${avgRating} (${reviews.length} reviews)` : ""}
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
            <Button onClick={() => void handleBook()}>Confirm booking</Button>
            <Button variant="secondary" onClick={() => void handleRelease()}>
              Release hold
            </Button>
          </div>
        </Card>
      )}

      {booking && (
        <Card>
          <Alert kind="success">
            Appointment created — status {booking.status.replaceAll("_", " ")}.
            {booking.paymentRequired && " Proceed to My Appointments to complete online payment."}
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

      <h2>Patient reviews ({reviews.length})</h2>
      {reviews.length === 0 ? (
        <EmptyState>No reviews yet for this doctor.</EmptyState>
      ) : (
        reviews.map((rev) => (
          <Card key={rev.id}>
            <div className="row space-between">
              <Badge tone="success">
                {renderStars(rev.rating)} ({rev.rating}/5)
              </Badge>
              <div className="row">
                <span className="muted small">{formatDhakaDate(rev.createdAt)}</span>
                {isAdmin(user) && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      void reviewsApi
                        .removeAsAdmin(rev.id)
                        .then(() =>
                          setReviews((current) => current.filter((item) => item.id !== rev.id)),
                        )
                        .catch((caught) =>
                          setError(getErrorMessage(caught, "Could not remove review.")),
                        );
                    }}
                  >
                    Hide review
                  </Button>
                )}
              </div>
            </div>
            {rev.comment && <p style={{ margin: "0.5rem 0 0" }}>{rev.comment}</p>}
          </Card>
        ))
      )}
    </div>
  );
}
