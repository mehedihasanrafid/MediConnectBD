/**
 * Prescriptions domain API functions (doctor issue/edit/delete, patient view, public verification).
 */

import type { Medicine, Prescription, VerifyPrescriptionResponse } from "../shared/types";
import { api } from "./client";

export interface CreatePrescriptionInput {
  appointmentId: string;
  diagnosis: string;
  medicines: Medicine[];
  tests?: string[];
  advice?: string | null;
}

export interface UpdatePrescriptionInput {
  diagnosis?: string | null;
  medicines?: Medicine[] | null;
  tests?: string[] | null;
  advice?: string | null;
}

export const prescriptionsApi = {
  create: (input: CreatePrescriptionInput) =>
    api.post<Prescription>("/prescriptions/me/prescriptions", input),
  listDoctorPrescriptions: () =>
    api.get<{ items: Prescription[] }>("/prescriptions/me/prescriptions"),
  update: (prescriptionId: string, input: UpdatePrescriptionInput) =>
    api.put<Prescription>(`/prescriptions/${prescriptionId}`, input),
  remove: (prescriptionId: string) =>
    api.delete<void>(`/prescriptions/${prescriptionId}`),
  listPatientPrescriptions: () =>
    api.get<{ items: Prescription[] }>("/prescriptions/patients/me/prescriptions"),
  verifyByCode: (verificationCode: string) =>
    api.get<VerifyPrescriptionResponse>(`/prescriptions/verify/${encodeURIComponent(verificationCode)}`),
};
