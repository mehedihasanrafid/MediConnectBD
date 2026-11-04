/**
 * Type definitions for MediConnect BD Communication Engine 2.0 (Phase 1):
 * Persistent doctor-patient messaging, conversation lifecycles, and 7-day follow-up entitlements.
 */

import { ConversationStatus } from "./conversation.entity";
export { ConversationStatus };

export type MessageSenderRole = "DOCTOR" | "PATIENT";
export type ConversationParticipantRole = "DOCTOR" | "PATIENT";
export type EntitlementStatus = "ACTIVE" | "EXPIRED";

export interface ActorContext {
  userId: string;
  userRole: "DOCTOR" | "PATIENT";
  doctorProfileId?: string | null;
  patientProfileId?: string | null;
  userName?: string;
}

export interface BeneficiaryView {
  id: string;
  name: string;
  relationship: string;
}

export interface ParticipantView {
  userId: string;
  role: ConversationParticipantRole;
  name: string;
  subtitle?: string | null;
  avatarUrl?: string | null;
}

export interface CommunicationEntitlementView {
  windowStartsAt: string;
  windowExpiresAt: string;
  isExpired: boolean;
  daysRemaining: number;
  isExtended: boolean;
}

export interface MessageView {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  senderName: string;
  content: string;
  idempotencyKey?: string | null;
  createdAt: string;
}

export interface CommunicationCapabilities {
  canSend?: boolean;
  videoAvailable?: boolean;
  communicationState?: "AVAILABLE" | "EXPIRED" | "UNAVAILABLE";
  unavailableReason?: string;
}

export interface ConversationSummaryView extends CommunicationCapabilities {
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  id: string;
  appointmentId: string;
  appointmentMode: "VIDEO" | "CHAMBER";
  appointmentStatus: string;
  status: ConversationStatus;
  participant: ParticipantView;
  beneficiary: BeneficiaryView | null;
  entitlement: CommunicationEntitlementView;
  lastMessage: MessageView | null;
  unreadCount: number;
  updatedAt: string;
}

export interface ConversationDetailView extends CommunicationCapabilities {
  participant?: ParticipantView;
  id: string;
  appointmentId: string;
  appointmentMode: "VIDEO" | "CHAMBER";
  appointmentStatus: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status: ConversationStatus;
  doctor: {
    profileId: string;
    userId: string;
    name: string;
    specialty?: string | null;
    hospital?: string | null;
    avatarUrl?: string | null;
  };
  patient: {
    profileId: string;
    userId: string;
    name: string;
  };
  beneficiary: BeneficiaryView | null;
  entitlement: CommunicationEntitlementView;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageInput {
  content: string;
  idempotencyKey?: string | null | undefined;
}

export interface PaginatedMessagesView {
  items: MessageView[];
  nextCursor: string | null;
  hasMore: boolean;
}
