import type { Page } from "@playwright/test";
import type { DoctorProfileData } from "../../src/doctor/profile/types/doctorProfile.types";
import { mockPatientDashboard } from "./patient-dashboard";

export const photoPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZ0AAAAASUVORK5CYII=", "base64");
export const uploadedPhotoUrl = "/api/v1/doctors/photos/00000000-0000-4000-8000-000000000099";
/** Synthetic state only: every API request is intercepted before it reaches the application. */
export async function mockProfile(page: Page, status = "APPROVED") {
  await mockPatientDashboard(page);
  const hospitals = [
    { id: "hospital-a", name: "Synthetic Hospital A", slug: "synthetic-a", area: "Dhaka", address: "Synthetic road A" },
    { id: "hospital-b", name: "Synthetic Hospital B", slug: "synthetic-b", area: "Dhaka", address: "Synthetic road B" },
  ];
  const specialties = [{ id: "medicine", name: "Medicine", slug: "medicine" }, { id: "cardiology", name: "Cardiology", slug: "cardiology" }];
  const profile: DoctorProfileData = { id: "doctor", firstName: "Synthetic", lastName: "Doctor", bmdcNumber: "TEST-ONLY",
    degrees: "Synthetic MBBS", experienceYears: 10, bio: "Synthetic biography", languages: ["Bangla", "English"],
    applicationStatus: status, rejectionReason: null, videoConsultationFee: 800, photoUrl: null, specialties: [specialties[0]],
    chambers: [{ id: "chamber-a", hospitalId: "hospital-a", roomOrUnit: "Room 402", consultationFee: 1000, isActive: true, hospital: hospitals[0] }] };
  const fixture = { profile, requests: [] as string[], writes: [] as { method: string; path: string; body: any }[],
    failSave: false, failPhoto: false, failLoad: false, failCatalogs: false };
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(), method = request.method();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    fixture.requests.push(`${method} ${path}`);
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === "/auth/refresh") return json({ accessToken: "synthetic-token", accessTokenExpiresIn: 900, tokenType: "Bearer",
      user: { id: "doctor-user", firstName: profile.firstName, lastName: profile.lastName, email: "doctor@example.test",
        roles: ["DOCTOR"], status: "ACTIVE", patientProfileId: null,
        doctorProfile: { id: profile.id, applicationStatus: profile.applicationStatus, photoUrl: profile.photoUrl } } });
    if (path === "/doctors/me" && method === "GET") return fixture.failLoad
      ? json({ message: "Synthetic profile unavailable" }, 503) : json(profile);
    if (path.startsWith("/doctors/photos/")) return route.fulfill({ contentType: "image/png", body: photoPng });
    if (path === "/catalog/hospitals") return fixture.failCatalogs ? json({ message: "Catalog offline" }, 503) : json({ items: hospitals });
    if (path === "/catalog/specialties") return fixture.failCatalogs ? json({ message: "Catalog offline" }, 503) : json({ items: specialties });
    if (["/doctors/me", "/doctors/me/photo", "/doctors/me/submit"].includes(path) && method !== "GET") {
      const body = request.postData() ? request.postDataJSON() : null;
      fixture.writes.push({ method, path, body });
      if (path === "/doctors/me/photo") return fixture.failPhoto ? json({ message: "Synthetic photo unavailable" }, 503) : json({ photoUrl: uploadedPhotoUrl }, 201);
      if (fixture.failSave) return json({ message: "Synthetic save unavailable" }, 503);
      if (path === "/doctors/me/submit") { profile.applicationStatus = "PENDING_REVIEW"; return json(profile); }
      const oldStatus = profile.applicationStatus;
      for (const key of ["degrees", "experienceYears", "bio", "languages", "videoConsultationFee", "photoUrl"] as const) {
        if (key in body) Object.assign(profile, { [key]: body[key] });
      }
      if ("specialtyIds" in body) profile.specialties = specialties.filter((item) => body.specialtyIds.includes(item.id));
      if ("chambers" in body) profile.chambers = body.chambers.map((chamber: any, index: number) => ({
        ...chamber, id: `chamber-${index}`, isActive: true, hospital: hospitals.find((item) => item.id === chamber.hospitalId),
      }));
      if (oldStatus === "APPROVED") profile.applicationStatus = "DRAFT";
      return json(profile);
    }
    return route.fallback();
  });
  return fixture;
}
