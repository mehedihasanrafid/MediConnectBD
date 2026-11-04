import type { DoctorAppointment } from "../../../../shared/types";

export const appointment: DoctorAppointment = {
  id: "appointment-a", doctorId: "doctor", holdId: "hold", patientProfileId: "patient-a",
  status: "CONFIRMED", mode: "VIDEO", scheduledStartAt: "2026-11-04T10:00:00Z",
  scheduledEndAt: "2026-11-04T10:20:00Z", feeAmount: 800, paymentRequired: true,
  paymentReference: null, cancellationReason: null, createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
  slot: { id: "slot", doctorId: "doctor", startAt: "2026-11-04T10:00:00Z",
    endAt: "2026-11-04T10:20:00Z", feeAmount: 800, mode: "VIDEO", chamber: null },
  patient: { id: "patient-a", userId: "user-a", firstName: "Synthetic", lastName: "Patient",
    email: "synthetic@example.test", phone: null, gender: "FEMALE", dateOfBirth: "1994-01-01" },
};
