/**
 * Type definitions for the Communication Module:
 * Handles asynchronous consultation messaging, telehealth video quick-launching,
 * shared clinical attachments, and follow-up consultation threads.
 */

export type ConversationFilter = "ALL" | "ACTIVE" | "FOLLOWUP" | "SUPPORT";

export type MessageSenderRole = "DOCTOR" | "PATIENT" | "SYSTEM" | "SUPPORT";

export interface MessageAttachment {
  id: string;
  name: string;
  type: "IMAGE" | "PDF" | "REPORT";
  size?: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: MessageSenderRole;
  text: string;
  timestamp: string;
  attachments?: MessageAttachment[];
  systemNotice?: boolean;
}

export interface LinkedConsultation {
  appointmentId: string;
  mode: "VIDEO" | "CHAMBER";
  status: "CONFIRMED" | "COMPLETED" | "PENDING_PAYMENT";
  scheduledStartAt: string;
  scheduledEndAt: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorHospital?: string;
  patientName: string;
  feeAmount: string;
  prescriptionId?: string;
  prescriptionCode?: string;
  followUpDaysLeft?: number;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: "DOCTOR" | "PATIENT" | "SUPPORT";
  participantSubtitle: string;
  participantAvatar?: string;
  status: "LIVE_CONSULTATION" | "ACTIVE_FOLLOWUP" | "ARCHIVED" | "SUPPORT";
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string;
  linkedConsultation?: LinkedConsultation;
}
