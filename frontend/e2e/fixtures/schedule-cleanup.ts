import type { Page } from "@playwright/test";
import type { DoctorScheduleData } from "../../src/doctor/schedule/types/doctorSchedule.types";
import { mockPatientDashboard } from "./patient-dashboard";

/** Intercepts every API request; mutations only update these synthetic fixtures. */
export async function mockSchedule(page: Page, failLoad = false) {
  await mockPatientDashboard(page);
  const chamber = { id: "chamber", hospitalId: "hospital", roomOrUnit: "Room 402", consultationFee: 1000,
    hospital: { id: "hospital", name: "Synthetic Hospital", area: "Dhaka", address: "Synthetic road" } };
  const schedule: DoctorScheduleData = {
    rules: [
      { id: "video", dayOfWeek: 0, startTime: "09:00:00", endTime: "12:00:00", slotDurationMinutes: 15, mode: "VIDEO" },
      { id: "chamber-rule", dayOfWeek: 1, startTime: "17:00:00", endTime: "21:00:00",
        slotDurationMinutes: 20, mode: "CHAMBER", chamberId: chamber.id, chamber },
    ],
    timeOff: [{ id: "leave", date: "2026-11-15", startTime: null, endTime: null, reason: "Synthetic conference" }],
  };
  const fixture = { schedule, writes: [] as { method: string; path: string; body: any }[],
    failSave: false, failRemoveLeave: false, failLoad };
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    const method = request.method();
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === "/doctors/me" && method === "GET") return json({
      id: "doctor", bmdcNumber: "TEST", applicationStatus: "APPROVED", degrees: "", experienceYears: 0,
      bio: "", languages: [], rejectionReason: null, videoConsultationFee: 800, specialties: [], chambers: [chamber],
    });
    if (path === "/doctors/me/schedule" && method === "GET") return fixture.failLoad
      ? json({ message: "Schedule service unavailable" }, 503) : json(schedule);
    if (path.startsWith("/doctors/me/") && method !== "GET") {
      const body = request.postData() ? request.postDataJSON() : null;
      fixture.writes.push({ method, path, body });
      if (fixture.failSave || fixture.failRemoveLeave && method === "DELETE") {
        return json({ message: "Synthetic save unavailable" }, 503);
      }
      if (path === "/doctors/me/schedule" && method === "PUT") {
        schedule.rules = body.rules.map((rule: any, index: number) => ({
          ...rule, id: `rule-${index}`, ...(rule.mode === "CHAMBER" ? { chamber } : {}),
        }));
        return json(schedule);
      }
      if (path === "/doctors/me/time-off" && method === "POST") {
        schedule.timeOff.push({ ...body, id: `leave-${schedule.timeOff.length}` });
        return json(schedule.timeOff.at(-1), 201);
      }
      if (path.startsWith("/doctors/me/time-off/") && method === "DELETE") {
        schedule.timeOff = schedule.timeOff.filter((entry) => entry.id !== path.split("/").at(-1));
        return route.fulfill({ status: 204 });
      }
      if (path === "/doctors/me/slots/generate" && method === "POST") return json({ generated: 12 });
      return json({ message: `Unexpected synthetic write: ${path}` }, 400);
    }
    return route.fallback();
  });
  return fixture;
}
