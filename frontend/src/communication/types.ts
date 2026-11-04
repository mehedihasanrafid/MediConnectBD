/** Proposed communication contract: backend owns membership and capabilities. */
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: "DOCTOR" | "PATIENT" | "ADMIN";
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatarUrl?: string | null;
  participantRole: "DOCTOR" | "PATIENT" | "ADMIN";
  participantSubtitle: string;
  lastMessage: string;
  lastMessageAt: string;
  status?: string;
  unreadCount?: number;
  kind?: "CONSULTATION" | "SUPPORT" | "COLLEAGUE" | "STAFF";
  appointmentMode?: "VIDEO" | "CHAMBER";
  appointmentStatus?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  beneficiary?: { id: string; name: string; relationship: string } | null;
  entitlement?: { windowExpiresAt: string; isExpired: boolean; daysRemaining: number } | null;
  canSend: boolean;
  videoAvailable?: boolean;
  communicationState: "AVAILABLE" | "EXPIRED" | "UNAVAILABLE";
  unavailableReason?: string;
  linkedConsultation?: { appointmentId: string };
}

export function canCompose(conversation: Conversation | null): boolean {
  return conversation?.canSend === true && conversation.communicationState === "AVAILABLE";
}
