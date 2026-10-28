/**
 * Doctor profile with the next seven days of availability and public patient reviews.
 * Selecting a slot creates a ten-minute hold; the patient then confirms the booking.
 */

import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, Page, Spinner } from "../../shared/ui";
import { useAuth } from "../../features/auth/AuthContext";
import { isAdmin } from "../../shared/utils/roles";
import { AvailabilityScheduleGrid } from "./components/AvailabilityScheduleGrid";
import { DoctorProfileHeader } from "./components/DoctorProfileHeader";
import { DoctorReviewsList } from "./components/DoctorReviewsList";
import { SlotHoldBanner } from "./components/SlotHoldBanner";
import styles from "./DoctorDetailPage.module.css";
import { useDoctorDetail } from "./hooks/useDoctorDetail";

export function DoctorDetailPage() {
  const { doctorId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    doctor,
    availability,
    reviews,
    loading,
    error,
    hold,
    booking,
    busySlotId,
    familyMembers,
    selectedFamilyMemberId,
    setSelectedFamilyMemberId,
    handleHold,
    handleBook,
    handleRelease,
    handleRemoveReview,
  } = useDoctorDetail(doctorId, user, () => navigate("/login"));

  if (loading) return <Spinner label="Loading doctor…" />;
  if (!doctor) return <Alert kind="error">{error ?? "Doctor not found."}</Alert>;

  return (
    <Page>
      <DoctorProfileHeader doctor={doctor} reviews={reviews} />

      {error && <Alert kind="error">{error}</Alert>}

      {hold && (
        <SlotHoldBanner
          hold={hold}
          user={user}
          familyMembers={familyMembers}
          selectedFamilyMemberId={selectedFamilyMemberId}
          onSelectFamilyMember={setSelectedFamilyMemberId}
          onConfirmBook={handleBook}
          onReleaseHold={handleRelease}
        />
      )}

      {booking && (
        <Card className={styles.successCard}>
          <Alert kind="success">
            Appointment created — status {booking.status.replaceAll("_", " ")}.
            {booking.paymentRequired && " Proceed to My Appointments to complete online payment."}
          </Alert>
          <Button variant="secondary" onClick={() => navigate("/appointments")}>
            View my appointments
          </Button>
        </Card>
      )}

      <AvailabilityScheduleGrid
        slots={availability?.items ?? []}
        busySlotId={busySlotId}
        hasActiveHold={hold !== null}
        onHoldSlot={handleHold}
      />

      <DoctorReviewsList
        reviews={reviews}
        canModerate={isAdmin(user)}
        onRemoveReview={handleRemoveReview}
      />
    </Page>
  );
}
