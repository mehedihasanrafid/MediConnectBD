import { request } from "../../api/client";
import type { ChatMessage, Conversation } from "../types";
import { isConversation, isMessage } from "./communicationValidation";
const base = "/communication/conversations";
const itemPath = (id: string) => id.startsWith("direct:")
  ? `/communication/direct/conversations/${encodeURIComponent(id.slice(7))}` : `${base}/${encodeURIComponent(id)}`;
export interface MessagePage { items: ChatMessage[]; nextCursor: string | null; hasMore: boolean }
function message(value: any): ChatMessage {
  const mapped = { ...value, text: value?.content, timestamp: value?.createdAt };
  if (!isMessage(mapped)) throw new Error("Invalid message response");
  return mapped;
}
function conversation(value: any): Conversation {
  const mapped = { ...value, participantId: value?.participant?.userId,
    participantName: value?.participant?.name, participantRole: value?.participant?.role,
    participantAvatarUrl: value?.participant?.avatarUrl ?? (value?.participant?.role === "DOCTOR" ? value?.doctor?.avatarUrl : null) ?? null,
    participantSubtitle: value?.participant?.subtitle ?? (value?.beneficiary
      ? `Patient: ${value.beneficiary.name} · ${value.beneficiary.relationship}` : value?.kind === "SUPPORT" ? "Support" : "Consultation"),
    kind: value?.kind ?? "CONSULTATION",
    lastMessage: value?.lastMessage?.content ?? "", lastMessageAt: value?.lastMessage?.createdAt ?? "",
    linkedConsultation: value?.appointmentId ? { appointmentId: value.appointmentId } : undefined };
  if (!isConversation(mapped)) throw new Error("Invalid conversation response");
  return mapped;
}
export const communicationApi = {
  async listDirect(signal?: AbortSignal): Promise<Conversation[]> {
    const result = await request<{ items: unknown[] }>("/communication/direct/conversations", { signal });
    if (!Array.isArray(result.items)) throw new Error("Invalid conversation response");
    return result.items.map(conversation);
  },
  async create(kind: "SUPPORT" | "COLLEAGUE" | "STAFF", recipientId?: string): Promise<Conversation> {
    return conversation(await request("/communication/direct/conversations", { method: "POST", body: JSON.stringify({ kind, recipientId }) }));
  },
  contacts(kind: string, search: string, signal?: AbortSignal) {
    return request<{ items: { userId: string; name: string; role: string; avatarUrl?: string | null }[] }>(
      `/communication/direct/contacts?${new URLSearchParams({ kind, search })}`, { signal });
  },
  async list(signal?: AbortSignal): Promise<Conversation[]> {
    const result = await request<{ items: unknown[] }>(base, { signal });
    if (!Array.isArray(result.items)) throw new Error("Invalid conversation response");
    return result.items.map(conversation);
  },
  async detail(id: string, signal?: AbortSignal): Promise<Conversation> {
    const result = conversation(await request(itemPath(id), { signal }));
    if (result.id !== id) throw new Error("Invalid conversation response");
    return result;
  },
  async messages(id: string, signal?: AbortSignal, before?: string): Promise<MessagePage> {
    const query = new URLSearchParams({ limit: "30" });
    if (before) query.set("before", before);
    const result = await request<any>(`${itemPath(id)}/messages?${query}`, { signal });
    if (!Array.isArray(result.items) || typeof result.hasMore !== "boolean" ||
      !(result.nextCursor === null || typeof result.nextCursor === "string")) throw new Error("Invalid message response");
    const items = result.items.map(message);
    if (items.some((m: ChatMessage) => m.conversationId !== id)) throw new Error("Invalid message response");
    return { items, nextCursor: result.nextCursor, hasMore: result.hasMore };
  },
  async send(id: string, text: string, idempotencyKey: string = crypto.randomUUID()): Promise<ChatMessage> {
    const result = message(await request(`${itemPath(id)}/messages`, {
      method: "POST", body: JSON.stringify({ content: text, idempotencyKey }),
    }));
    if (result.conversationId !== id) throw new Error("Invalid message response");
    return result;
  },
};
