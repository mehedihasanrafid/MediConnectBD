import type { User } from "../../users/user.entity";
import type { DirectConversation, DirectMessage } from "./direct.entities";
import { canDirect, roleOf } from "./direct.policy";

export function contactView(user: User, doctor = false) {
  const role = doctor ? "DOCTOR" as const : roleOf(user);
  return { userId: user.id, role, name: `${role === "DOCTOR" ? "Dr. " : ""}${user.firstName} ${user.lastName}`,
    avatarUrl: user.doctorProfile?.photoUrl ?? null, subtitle: role === "ADMIN" ? "Support staff" : role === "DOCTOR" ? "Doctor" : "Patient" };
}
export function directMessageView(message: DirectMessage) {
  return { id: message.id, conversationId: `direct:${message.conversationId}`, senderId: message.senderId,
    senderRole: message.senderRole, senderName: message.senderName, content: message.content, createdAt: message.createdAt.toISOString() };
}
export function directView(conversation: DirectConversation, userId: string, last: DirectMessage | null, unreadCount: number) {
  const other = conversation.memberAId === userId ? conversation.memberB : conversation.memberA;
  const canSend = canDirect(conversation.kind, conversation.memberA, conversation.memberB);
  return { id: `direct:${conversation.id}`, kind: conversation.kind, appointmentId: null,
    participant: contactView(other, conversation.kind === "COLLEAGUE"), lastMessage: last ? directMessageView(last) : null,
    unreadCount, canSend, communicationState: canSend ? "AVAILABLE" as const : "UNAVAILABLE" as const,
    unavailableReason: canSend ? "" : "A member is unavailable or no longer eligible for this conversation.",
    videoAvailable: false, updatedAt: conversation.updatedAt.toISOString(), createdAt: conversation.createdAt.toISOString() };
}
