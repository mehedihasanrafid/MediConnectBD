import type { ChatMessage, Conversation } from "../types";

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const strings = (value: Record<string, unknown>, keys: string[]) =>
  keys.every((key) => typeof value[key] === "string");

export function isConversation(value: unknown): value is Conversation {
  if (!record(value)) return false;
  return strings(value, ["id", "participantId", "participantName", "participantSubtitle",
    "lastMessage", "lastMessageAt"]) && Boolean(value.id) &&
    ["DOCTOR", "PATIENT", "ADMIN"].includes(String(value.participantRole)) &&
    typeof value.canSend === "boolean" &&
    ["AVAILABLE", "EXPIRED", "UNAVAILABLE"].includes(String(value.communicationState)) &&
    (value.unavailableReason === undefined || typeof value.unavailableReason === "string") &&
    (value.videoAvailable === undefined || typeof value.videoAvailable === "boolean") &&
    (value.linkedConsultation === undefined || (record(value.linkedConsultation) &&
      typeof value.linkedConsultation.appointmentId === "string"));
}

export function isMessage(value: unknown): value is ChatMessage {
  if (!record(value)) return false;
  return strings(value, ["id", "conversationId", "senderId", "senderName", "text", "timestamp"]) &&
    Boolean(value.id) && ["DOCTOR", "PATIENT", "ADMIN"].includes(String(value.senderRole)) &&
    !Number.isNaN(Date.parse(String(value.timestamp)));
}
