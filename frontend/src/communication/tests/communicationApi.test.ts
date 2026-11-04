import { afterEach, describe, expect, it, vi } from "vitest";
import { communicationApi } from "../api/communicationApi";
import { communicationClosed, communicationError } from "../api/communicationErrors";
import { ApiRequestError, setAccessToken } from "../../api/client";

const message = { id: "m1", conversationId: "c/1", senderId: "p1", senderName: "Patient",
  senderRole: "PATIENT", content: "Hello", createdAt: "2026-11-03T10:00:00Z" };
const conversation = { id: "c/1", participantId: "d1", participantName: "Doctor",
  participant: { userId: "d1", name: "Doctor", role: "DOCTOR" }, appointmentId: "a1", participantRole: "DOCTOR", participantSubtitle: "Consultation", lastMessage: "",
  lastMessageAt: "", canSend: true, communicationState: "AVAILABLE" };
function respond(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}
afterEach(() => { vi.unstubAllGlobals(); setAccessToken(null); });

describe("communication HTTP contract", () => {
  it("fetches the server list using authenticated shared transport", async () => {
    const fetcher = respond({ items: [conversation] });
    vi.stubGlobal("fetch", fetcher); setAccessToken("test-token");
    expect(await communicationApi.list()).toMatchObject([{ id: conversation.id }]);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("/api/v1/communication/conversations");
    expect(options.credentials).toBe("include");
    expect(options.headers.get("Authorization")).toBe("Bearer test-token");
  });
  it("encodes IDs and fetches detail and history", async () => {
    const fetcher = respond(conversation); vi.stubGlobal("fetch", fetcher);
    expect(await communicationApi.detail("c/1")).toMatchObject({ id: conversation.id });
    expect(fetcher.mock.calls[0][0]).toBe("/api/v1/communication/conversations/c%2F1");
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ items: [message], nextCursor: null, hasMore: false })));
    expect(await communicationApi.messages("c/1")).toMatchObject({ items: [{ id: message.id }] });
    expect(fetcher.mock.calls[1][0]).toContain("c%2F1/messages?limit=30");
  });
  it("passes pagination cursors and stable retry keys to the actual API", async () => {
    const fetcher = respond({ items: [message], nextCursor: "older-id", hasMore: true });
    vi.stubGlobal("fetch", fetcher);
    expect((await communicationApi.messages("c/1", undefined, "cursor-id")).nextCursor).toBe("older-id");
    expect(fetcher.mock.calls[0][0]).toContain("before=cursor-id");
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify(message)));
    await communicationApi.send("c/1", "Hello", "stable-key");
    expect(JSON.parse(fetcher.mock.calls[1][1].body).idempotencyKey).toBe("stable-key");
  });
  it("posts text and uses only a server-confirmed message", async () => {
    const fetcher = respond(message); vi.stubGlobal("fetch", fetcher);
    expect(await communicationApi.send("c/1", "Hello")).toMatchObject({ id: message.id, text: message.content });
    const options = fetcher.mock.calls[0][1];
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toMatchObject({ content: "Hello" });
  });
  it("rejects malformed responses instead of falling back to demos", async () => {
    vi.stubGlobal("fetch", respond({ conversations: [{ id: "fake" }] }));
    await expect(communicationApi.list()).rejects.toThrow("Invalid conversation response");
  });
  it("rejects history or saved messages from another conversation", async () => {
    vi.stubGlobal("fetch", respond({ items: [message], nextCursor: null, hasMore: false }));
    await expect(communicationApi.messages("other")).rejects.toThrow("Invalid message response");
    vi.stubGlobal("fetch", respond(message));
    await expect(communicationApi.send("other", "Hello")).rejects.toThrow("Invalid message response");
  });
  it.each([403, 404, 409, 410, 429, 503])("handles HTTP %s without synthetic data", async (status) => {
    vi.stubGlobal("fetch", respond({ code: "CLOSED", message: "Server error" }, status));
    await expect(communicationApi.messages("c/1")).rejects.toBeInstanceOf(ApiRequestError);
    expect(communicationError(new ApiRequestError(status, "CLOSED", "Server error"))).not.toBe("Server error");
  });
  it("marks expired/revoked permissions closed and handles network failure", () => {
    expect(communicationClosed(new ApiRequestError(410, "EXPIRED", "Expired"))).toBe(true);
    expect(communicationClosed(new Error("Offline"))).toBe(false);
    expect(communicationError(new Error("Offline"))).toContain("Could not reach");
  });
});
