import { AppError } from "../../../utils/app-error";
import type { AuthUser } from "../../auth/auth.types";
import type { CommunicationService } from "../communication.service";
import type { DirectStore } from "../direct/direct.store";
import { canDirect } from "../direct/direct.policy";

export class CallAccess {
  constructor(private readonly consultations: CommunicationService, private readonly direct: DirectStore) {}
  async resolve(reference: string, user: AuthUser) {
    if (reference.startsWith("direct:")) {
      const row = await this.direct.get(reference.slice(7), user);
      if (!canDirect(row.kind, row.memberA, row.memberB)) throw new AppError(409, "CALL_UNAVAILABLE", "Calling is unavailable for this conversation");
      return { peerId: row.memberAId === user.id ? row.memberBId : row.memberAId, closesAt: null as Date | null, roomName: null as string | null };
    }
    if (!user.roles.some((role) => role === "DOCTOR" || role === "PATIENT")) throw new AppError(403, "CALL_FORBIDDEN", "This consultation is private");
    const doctor = user.roles.includes("DOCTOR");
    const conversation = await this.consultations.getConversation(reference, {
      userId: user.id, userRole: doctor ? "DOCTOR" : "PATIENT", doctorProfileId: user.doctorProfile?.id ?? null, patientProfileId: user.patientProfileId,
    });
    if (!conversation.videoAvailable || conversation.status === "BLOCKED") throw new AppError(409, "CALL_UNAVAILABLE", "Calls are outside this video appointment's entry window");
    const peerId = doctor ? conversation.patient.userId : conversation.doctor.userId;
    await this.direct.user(peerId);
    return { peerId, closesAt: new Date(conversation.scheduledEndAt), roomName: `mediconnect-consult-${conversation.appointmentId}` };
  }
}
