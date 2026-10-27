/**
 * Prescriptions domain API functions (doctor issue/edit/delete, patient view, public verification).
 */

import type {
  Medicine,
  MedicineSuggestion,
  Prescription,
  VerifyPrescriptionResponse,
} from "../shared/types";
import { api, downloadBlob } from "./client";

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
  suggestMedicines: (q: string) =>
    api.get<{ items: MedicineSuggestion[] }>(
      `/prescriptions/medicines/suggest?q=${encodeURIComponent(q)}`,
    ),
  downloadPdf: async (prescriptionId: string, verificationCode: string) => {
    const blob = await downloadBlob(`/prescriptions/${prescriptionId}/pdf`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prescription-${verificationCode}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
