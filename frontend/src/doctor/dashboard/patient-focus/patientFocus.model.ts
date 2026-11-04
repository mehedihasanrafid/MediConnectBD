import type { DoctorAppointment } from "../../../shared/types";
import { formatStatus } from "../../../shared/utils/format";

const dhakaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" });

export function todaysPatients(appointments: DoctorAppointment[], now: Date) {
  const day = dhakaDay.format(now);
  const today = appointments.filter((appointment) => {
    const start = new Date(appointment.scheduledStartAt);
    return Number.isFinite(start.getTime()) && dhakaDay.format(start) === day;
  }).sort((a, b) => Date.parse(a.scheduledStartAt) - Date.parse(b.scheduledStartAt));
  const remaining = today.filter((a) => ["CONFIRMED", "PENDING_PAYMENT"].includes(a.status));
  const next = remaining.find((a) => Date.parse(a.scheduledEndAt) > now.getTime()) ?? remaining[0] ?? null;
  return { today, remaining, next, completed: today.filter((a) => a.status === "COMPLETED").length };
}

export function patientIdentity(appointment: DoctorAppointment, now = new Date()) {
  const owner = [appointment.patient?.firstName, appointment.patient?.lastName].filter(Boolean).join(" ");
  const family = Boolean(appointment.familyMemberId || appointment.familyMember);
  const name = family ? appointment.familyMember?.name || "Family member" : owner || "Patient details unavailable";
  const subtitle = family
    ? `${appointment.familyMember?.relationship || "Family booking"} · Booked by ${owner || "account holder"}`
    : [patientAge(appointment.patient?.dateOfBirth, now), appointment.patient?.gender && formatStatus(appointment.patient.gender), "Booking for self"].filter(Boolean).join(" · ");
  return { name, owner, family, subtitle, initials: name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() };
}

function patientAge(dateOfBirth: string | null | undefined, now: Date): string | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  if (!Number.isFinite(birth.getTime())) return null;
  const today = new Date(`${dhakaDay.format(now)}T00:00:00Z`);
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) age--;
  return age >= 0 && age < 130 ? `${age} years` : null;
}

export function videoEntry(appointment: DoctorAppointment, now: Date) {
  if (appointment.mode !== "VIDEO") return { available: false, reason: "This is a chamber appointment." };
  if (appointment.status !== "CONFIRMED") return { available: false, reason: "Video requires a confirmed appointment." };
  const start = Date.parse(appointment.scheduledStartAt), end = Date.parse(appointment.scheduledEndAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { available: false, reason: "Appointment time is unavailable." };
  if (now.getTime() < start - 300000) return { available: false, reason: "Video opens 5 minutes before the appointment." };
  if (now.getTime() >= end) return { available: false, reason: "The scheduled video window has ended." };
  return { available: true, reason: "The server will verify access when you join." };
}

export function legacyDashboardPath(tab: string | null): string | null {
  if (tab === "profile") return "/doctor/profile";
  if (tab === "schedule") return "/doctor/schedule";
  if (tab === "earnings" || tab === "analytics") return "/doctor/earnings";
  return null;
}
