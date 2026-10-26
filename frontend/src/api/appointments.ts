/**
 * Appointments and slot holds domain API functions.
 */

import type { Appointment, CancellationOutcome, SlotHold } from "../shared/types";
import { api } from "./client";

export const appointmentsApi = {
  holdSlot: (slotId: string) => api.post<SlotHold>("/appointments/holds", { slotId }),
  releaseHold: (holdId: string) => api.delete<void>(`/appointments/holds/${holdId}`),
  bookAppointment: (holdId: string) => api.post<Appointment>("/appointments", { holdId }),
  listMyAppointments: () => api.get<{ items: Appointment[] }>("/appointments/me"),
  cancelAppointment: (appointmentId: string, reason = "") =>
    api.post<CancellationOutcome>(`/appointments/${appointmentId}/cancel`, { reason }),
  completeAppointment: (appointmentId: string) =>
    api.post<Appointment>(`/appointments/${appointmentId}/complete`),
  markNoShow: (appointmentId: string) =>
    api.post<Appointment>(`/appointments/${appointmentId}/no-show`),
};
