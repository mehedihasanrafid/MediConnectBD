/**
 * API client functions for patient medical reports (upload, list, download, delete).
 */

import type { MedicalReportDetail, MedicalReportSummary } from "../shared/types";
import { api } from "./client";

export interface UploadMedicalReportInput {
  title: string;
  fileName: string;
  mimeType: string;
  contentBase64: string;
  notes?: string | null;
}

export const reportsApi = {
  listMyReports: () => api.get<{ items: MedicalReportSummary[] }>("/patients/me/reports"),
  uploadReport: (input: UploadMedicalReportInput) =>
    api.post<MedicalReportSummary>("/patients/me/reports", input),
  downloadReport: async (reportId: string) => {
    const detail = await api.get<MedicalReportDetail>(
      `/patients/me/reports/${reportId}/download`,
    );
    const byteCharacters = atob(detail.contentBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: detail.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = detail.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return detail;
  },
  deleteReport: (reportId: string) => api.delete<void>(`/patients/me/reports/${reportId}`),
};
