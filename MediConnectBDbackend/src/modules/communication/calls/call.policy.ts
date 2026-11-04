import { AppError } from "../../../utils/app-error";
import type { CallStatus, CommunicationCall } from "./call.entity";

export type CallAction = "accept" | "decline" | "cancel" | "end";
export function effectiveCallStatus(call: Pick<CommunicationCall, "status" | "expiresAt">, now: Date): CallStatus {
  return call.expiresAt <= now ? call.status === "RINGING" ? "MISSED" : call.status === "ACCEPTED" ? "ENDED" : call.status : call.status;
}
export function nextCallStatus(call: Pick<CommunicationCall, "status" | "callerId" | "calleeId" | "expiresAt">,
  userId: string, action: CallAction, now: Date): CallStatus {
  if (call.callerId !== userId && call.calleeId !== userId) throw new AppError(403, "CALL_FORBIDDEN", "Only call participants can use this call");
  const status = effectiveCallStatus(call, now);
  const target: Record<CallAction, CallStatus> = { accept: "ACCEPTED", decline: "DECLINED", cancel: "CANCELLED", end: "ENDED" };
  if (status === target[action] && (action === "end" || action === "cancel" && userId === call.callerId ||
    ["accept", "decline"].includes(action) && userId === call.calleeId)) return status;
  const allowed = status === "RINGING" && (action === "cancel" && userId === call.callerId ||
    ["accept", "decline"].includes(action) && userId === call.calleeId) || status === "ACCEPTED" && action === "end";
  if (!allowed) throw new AppError(409, "CALL_STATE_CHANGED", "The call has changed or expired. Refresh its status.");
  return target[action];
}
export function requireCallMember(call: Pick<CommunicationCall, "callerId" | "calleeId">, userId: string) {
  if (call.callerId !== userId && call.calleeId !== userId) throw new AppError(403, "CALL_FORBIDDEN", "Only call participants can access this call");
}
