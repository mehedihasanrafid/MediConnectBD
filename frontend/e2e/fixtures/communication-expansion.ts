import type { Page } from "@playwright/test";
import type { CommunicationCall } from "../../src/communication/calls/callApi";
import { photoPng } from "./profile-workspace";
export const clinicalId = "11111111-1111-4111-8111-111111111111";
const directId = "22222222-2222-4222-8222-222222222222";
const patientId = "patient-user", doctorId = "doctor-user", adminId = "admin-user";
/** Entire API and Daily traffic is intercepted. No application records or real calls are used. */
export async function mockCommunication(page: Page, role: "PATIENT" | "DOCTOR" | "ADMIN", seedDirect = true) {
  await page.clock.install({ time: new Date("2026-11-04T12:00:00Z") });
  const userId = role === "DOCTOR" ? doctorId : role === "ADMIN" ? adminId : patientId;
  const user = { id: userId, firstName: "Synthetic", lastName: role, email: "synthetic@example.test", status: "ACTIVE",
    roles: [role], patientProfileId: role === "PATIENT" ? "patient" : null,
    doctorProfile: role === "DOCTOR" ? { id: "doctor", applicationStatus: "APPROVED" } : null };
  const photo = "/api/v1/doctors/photos/00000000-0000-4000-8000-000000000099";
  const clinical = { id: clinicalId, appointmentId: "33333333-3333-4333-8333-333333333333", kind: "CONSULTATION",
    participant: { userId: role === "PATIENT" ? doctorId : patientId, name: role === "PATIENT" ? "Dr. Synthetic Doctor" : "Patient Account",
      role: role === "PATIENT" ? "DOCTOR" : "PATIENT", subtitle: "Family consultation" },
    doctor: { avatarUrl: photo }, beneficiary: { id: "child", name: "Synthetic Child", relationship: "Child" },
    scheduledStartAt: "2026-11-04T12:00:00Z", scheduledEndAt: "2026-11-04T12:30:00Z",
    appointmentMode: "VIDEO", appointmentStatus: "CONFIRMED", canSend: true, communicationState: "AVAILABLE", videoAvailable: true, lastMessage: null };
  const direct = (kind: string) => ({ id: "direct:" + directId, kind, appointmentId: null,
    participant: { userId: kind === "COLLEAGUE" ? "colleague-user" : kind === "STAFF" ? "staff-user" : role === "ADMIN" ? patientId : adminId,
      name: kind === "COLLEAGUE" ? "Dr. Colleague Peer" : kind === "STAFF" ? "Staff Peer" : role === "ADMIN" ? "Support Requester" : "Support Agent",
      role: kind === "COLLEAGUE" ? "DOCTOR" : role === "ADMIN" && kind === "SUPPORT" ? "PATIENT" : "ADMIN" },
    canSend: true, communicationState: "AVAILABLE", videoAvailable: false, unreadCount: 1, lastMessage: null });
  const state = { direct: seedDirect ? [direct(role === "DOCTOR" ? "COLLEAGUE" : "SUPPORT")] : [],
    messages: [] as any[], writes: [] as { path: string; body: any }[], requests: [] as string[], calls: [] as CommunicationCall[], failSend: false };
  const makeCall = (incoming: boolean, media: "AUDIO" | "VIDEO" = "AUDIO") => {
    const call: CommunicationCall = { id: "44444444-4444-4444-8444-" + String(state.calls.length + 1).padStart(12, "0"),
      conversationId: "direct:" + directId, caller: { userId: incoming ? adminId : userId, name: incoming ? "Support Agent" : "Synthetic Caller" },
      callee: { userId: incoming ? userId : "colleague-user", name: incoming ? "Synthetic Recipient" : "Colleague Peer" },
      media, status: "RINGING", createdAt: "2026-11-04T12:00:00Z", answeredAt: null, endedAt: null, expiresAt: "2026-11-04T12:00:45Z" };
    state.calls.push(call); return call;
  };
  await page.route("https://synthetic.daily.co/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>Synthetic test room</p>" }));
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(), method = request.method(), url = new URL(request.url()), path = url.pathname.replace("/api/v1", "");
    state.requests.push(method + " " + path);
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    const body = request.postData() ? request.postDataJSON() : null;
    if (method === "POST" && path !== "/auth/refresh") state.writes.push({ path, body });
    if (path === "/auth/refresh") return json({ user, accessToken: "synthetic-token", tokenType: "Bearer", accessTokenExpiresIn: 900 });
    if (path.startsWith("/doctors/photos/")) return route.fulfill({ contentType: "image/png", body: photoPng });
    if (path.startsWith("/notifications")) return json({ items: [], unreadCount: 0 });
    if (path === "/communication/capabilities") return json({ directMessaging: true, callsAvailable: true });
    if (path === "/communication/calls/active") return json({ items: state.calls.filter((call) => ["RINGING", "ACCEPTED"].includes(call.status)) });
    if (path === "/communication/calls" && method === "GET") return json({ items: state.calls });
    if (path === "/communication/calls" && method === "POST") return json(makeCall(false, body.media), 201);
    if (path.startsWith("/communication/calls/")) {
      const call = state.calls.find((item) => path.includes(item.id));
      if (!call) return json({ message: "Missing synthetic call" }, 404);
      if (path.endsWith("/actions")) {
        call.status = ({ accept: "ACCEPTED", decline: "DECLINED", cancel: "CANCELLED", end: "ENDED" } as const)[body.action as "accept"];
        return json(call);
      }
      if (path.endsWith("/room")) return call.status === "ACCEPTED"
        ? json({ roomUrl: "https://synthetic.daily.co/test", accessToken: "synthetic", provider: "daily", media: call.media, expiresAt: call.expiresAt })
        : json({ message: "Call is not accepted" }, 409);
      return json(call);
    }
    if (path === "/communication/direct/contacts") return json({ items: [{ userId: "colleague-user", name: role === "ADMIN" ? "Staff Peer" : "Dr. Colleague Peer", role: role === "ADMIN" ? "ADMIN" : "DOCTOR" }] });
    if (path === "/communication/direct/conversations") {
      if (method === "POST") { const thread = direct(body.kind); state.direct = [thread]; return json(thread, 201); }
      return json({ items: state.direct });
    }
    if (path === "/communication/conversations") return role === "ADMIN" ? json({ message: "Private consultations" }, 403) : json({ items: [clinical] });
    if (path.endsWith("/messages")) {
      if (method === "POST") {
        if (state.failSend) return json({ message: "Synthetic message unavailable" }, 503);
        const message = { id: "message-" + state.messages.length, conversationId: path.includes("/direct/") ? "direct:" + directId : clinicalId,
          senderId: userId, senderRole: role, senderName: "Synthetic Sender", content: body.content, createdAt: "2026-11-04T12:01:00Z" };
        state.messages.push(message);
        return json(message, 201);
      }
      return json({ items: state.messages, nextCursor: null, hasMore: false });
    }
    if (path.startsWith("/communication/direct/conversations/")) return json(state.direct[0]);
    if (path.startsWith("/communication/conversations/")) return json({ ...clinical, participant: { ...clinical.participant, subtitle: undefined } });
    return json({ message: "Unexpected synthetic API: " + path }, 404);
  });
  return { ...state, state, userId, incoming: () => makeCall(true),
    accept: () => { state.calls.at(-1)!.status = "ACCEPTED"; },
    reply: (content: string) => state.messages.push({ id: "reply-" + state.messages.length, conversationId: "direct:" + directId,
      senderId: adminId, senderRole: "ADMIN", senderName: "Support Agent", content, createdAt: "2026-11-04T12:02:00Z" }) };
}
