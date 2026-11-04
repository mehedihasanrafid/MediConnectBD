import { request } from "../../api/client";

export interface CommunicationCall {
  id: string; conversationId: string; caller: { userId: string; name: string }; callee: { userId: string; name: string };
  media: "AUDIO" | "VIDEO"; status: "RINGING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "MISSED" | "ENDED";
  createdAt: string; answeredAt: string | null; endedAt: string | null; expiresAt: string;
}
export interface CallRoom { roomUrl: string; accessToken: string; expiresAt: string; media: "AUDIO" | "VIDEO"; provider: "daily" }
export type CallAction = "accept" | "decline" | "cancel" | "end";
const base = "/communication/calls";
export const callApi = {
  capabilities: () => request<{ directMessaging: boolean; callsAvailable: boolean }>("/communication/capabilities"),
  active: () => request<{ items: CommunicationCall[] }>(`${base}/active`),
  detail: (id: string) => request<CommunicationCall>(`${base}/${encodeURIComponent(id)}`),
  start: (conversationId: string, media: "AUDIO" | "VIDEO", idempotencyKey: string) =>
    request<CommunicationCall>(base, { method: "POST", body: JSON.stringify({ conversationId, media, idempotencyKey }) }),
  action: (id: string, action: CallAction) => request<CommunicationCall>(`${base}/${encodeURIComponent(id)}/actions`,
    { method: "POST", body: JSON.stringify({ action }) }),
  room: (id: string) => request<CallRoom>(`${base}/${encodeURIComponent(id)}/room`),
  history: (conversationId: string) => request<{ items: CommunicationCall[] }>(
    `${base}?${new URLSearchParams({ conversationId })}`),
};
