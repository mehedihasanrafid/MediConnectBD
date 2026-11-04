import { AppError } from "../../utils/app-error";
import type { ActorContext } from "./communication.types";

interface PolicyConversation {
  status: string; doctorProfileId: string; patientProfileId: string; familyMemberId: string | null;
  doctorProfile?: { user?: { id: string } }; patientProfile?: { user?: { id: string } };
  familyMember?: { patientProfileId: string } | null;
  appointment?: { status: string; doctorProfileId: string; patientProfileId: string;
    familyMemberId: string | null; mode: string; scheduledStartAt: Date; scheduledEndAt: Date; completedAt?: Date | null };
  entitlement?: { isExtended: boolean; windowExpiresAt: Date } | null;
}

/** Missing metadata fails closed. Historical completions use scheduled end, never updatedAt. */
export function communicationExpiry(conv: PolicyConversation): Date | null {
  const appt = conv.appointment;
  const completion = appt?.completedAt ?? appt?.scheduledEndAt;
  const expiry = conv.entitlement?.isExtended ? conv.entitlement.windowExpiresAt :
    completion ? new Date(completion.getTime() + 7 * 86400000) : null;
  return expiry;
}

export function communicationCapabilities(conv: PolicyConversation, now: Date) {
  const appt = conv.appointment;
  const eligible = appt && ["CONFIRMED", "COMPLETED"].includes(appt.status);
  const expiry = communicationExpiry(conv);
  const expired = !expiry || now >= expiry;
  const started = appt && now >= appt.scheduledStartAt;
  const canSend = Boolean(eligible && started && !expired && conv.status === "ACTIVE" && conv.entitlement);
  return { canSend, communicationState: (expired ? "EXPIRED" : canSend ? "AVAILABLE" : "UNAVAILABLE") as "EXPIRED" | "AVAILABLE" | "UNAVAILABLE",
    videoAvailable: Boolean(appt?.status === "CONFIRMED" && appt.mode === "VIDEO" &&
      now.getTime() >= appt.scheduledStartAt.getTime() - 300000 && now < appt.scheduledEndAt),
    unavailableReason: canSend ? "" : "Communication is read-only or outside the appointment window." };
}

export function authorizeConversation(conv: PolicyConversation, actor: ActorContext): void {
  const own = actor.userRole === "DOCTOR"
    ? actor.doctorProfileId === conv.doctorProfileId && conv.doctorProfile?.user?.id === actor.userId
    : actor.patientProfileId === conv.patientProfileId && conv.patientProfile?.user?.id === actor.userId;
  const matchingAppointment = conv.appointment && conv.appointment.patientProfileId === conv.patientProfileId &&
    conv.appointment.doctorProfileId === conv.doctorProfileId && conv.appointment.familyMemberId === conv.familyMemberId;
  const familyOwned = !conv.familyMemberId || conv.familyMember?.patientProfileId === conv.patientProfileId;
  if (!own || !matchingAppointment || !familyOwned) {
    throw new AppError(403, "CONVERSATION_FORBIDDEN", "Conversation membership does not match the appointment");
  }
}
