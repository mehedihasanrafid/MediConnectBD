import type { Page } from "@playwright/test";
import type { DoctorAppointment } from "../../src/shared/types";

export const dashboardTime = new Date("2026-11-04T10:00:00Z");
export function dashboardAppointments(): DoctorAppointment[] {
  const base: DoctorAppointment = {
    id: "appointment-a", doctorId: "doctor", holdId: "hold", patientProfileId: "patient-a",
    status: "CONFIRMED", mode: "VIDEO", scheduledStartAt: "2026-11-04T10:00:00Z",
    scheduledEndAt: "2026-11-04T10:20:00Z", feeAmount: 800, paymentRequired: true,
    paymentReference: null, cancellationReason: null, createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z",
    slot: { id: "slot", doctorId: "doctor", startAt: "2026-11-04T10:00:00Z", endAt: "2026-11-04T10:20:00Z", feeAmount: 800, mode: "VIDEO", chamber: null },
    patient: { id: "patient-a", userId: "user-a", firstName: "Synthetic", lastName: "Patient A",
      email: "synthetic@example.test", phone: null, gender: "FEMALE", dateOfBirth: "1994-01-01" },
  };
  return [base, { ...base, id: "appointment-b", patientProfileId: "patient-b", mode: "CHAMBER",
    scheduledStartAt: "2026-11-04T11:00:00Z", scheduledEndAt: "2026-11-04T11:20:00Z",
    patient: { ...base.patient!, id: "patient-b", firstName: "Synthetic", lastName: "Patient B" } },
  { ...base, id: "appointment-family", familyMemberId: "family-a",
    scheduledStartAt: "2026-11-04T12:00:00Z", scheduledEndAt: "2026-11-04T12:20:00Z",
    familyMember: { id: "family-a", name: "Synthetic Child", relationship: "Child" } }];
}

/** All API traffic is intercepted; no application database or provider is used. */
export async function mockPatientDashboard(page: Page, failAppointments = false) {
  const appointments = dashboardAppointments();
  const requests: string[] = [];
  let mutations = 0;
  await page.clock.install({ time: dashboardTime });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    const method = route.request().method();
    requests.push(`${method} ${path}`);
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === "/auth/refresh") return json({ accessToken: "synthetic-test-token", accessTokenExpiresIn: 900,
      user: { id: "doctor-user", firstName: "Synthetic", lastName: "Doctor", email: "doctor@example.test",
        roles: ["DOCTOR"], status: "ACTIVE", patientProfileId: null, doctorProfile: { id: "doctor", applicationStatus: "APPROVED" } } });
    if (path === "/doctors/me") return json({ id: "doctor", bmdcNumber: "TEST-ONLY", applicationStatus: "APPROVED",
      degrees: "", experienceYears: 0, bio: "", languages: [], videoConsultationFee: 800, specialties: [], chambers: [] });
    if (path === "/doctors/me/appointments") return failAppointments
      ? json({ code: "TEST_UNAVAILABLE", message: "Appointment service unavailable" }, 503) : json({ items: appointments });
    if (path.includes("/history")) {
      const owner = appointments.find((a) => path.includes(a.patientProfileId))?.patient ?? appointments[0].patient!;
      return json({ patient: { ...owner, sex: owner.gender }, visits: [], prescriptions: [], reports: [] });
    }
    if (path.endsWith("/video-session")) return json({ code: "VIDEO_UNAVAILABLE", message: "Video provider unavailable for test" }, 503);
    if (path.endsWith("/complete") && method === "POST") {
      mutations++; appointments[0].status = "COMPLETED"; return json(appointments[0]);
    }
    if (path === "/communication/conversations") return json({ items: [{
      id: "conversation-a", appointmentId: "appointment-a", participant: { userId: "user-a", role: "PATIENT", name: "Synthetic Patient A" },
      canSend: true, communicationState: "AVAILABLE", videoAvailable: false,
    }] });
    if (path === "/communication/conversations/conversation-a") return json({
      id: "conversation-a", appointmentId: "appointment-a", participant: { userId: "user-a", role: "PATIENT", name: "Synthetic Patient A" },
      canSend: true, communicationState: "AVAILABLE", videoAvailable: false,
    });
    if (path === "/communication/conversations/conversation-a/messages") return json({ items: [], nextCursor: null, hasMore: false });
    if (path.startsWith("/notifications")) return json({ items: [], unreadCount: 0 });
    return json({ code: "UNEXPECTED_TEST_REQUEST", message: `Unexpected test API: ${path}` }, 404);
  });
  return { requests, mutations: () => mutations };
}
