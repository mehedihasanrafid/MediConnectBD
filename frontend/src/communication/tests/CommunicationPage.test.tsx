import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CommunicationPage } from "../CommunicationPage";
import { ChatWindow } from "../components/ChatWindow/ChatWindow";
import { ConversationList } from "../components/ConversationList/ConversationList";
import { canCompose, type Conversation } from "../types";

let user: { id: string; roles: string[] } | null = { id: "p1", roles: ["PATIENT"] };
vi.mock("../../features/auth/AuthContext", () => ({ useAuth: () => ({ user }) }));
const conversation: Conversation = {
  id: "c1", participantId: "d1", participantName: "Doctor One", participantRole: "DOCTOR",
  participantSubtitle: "Consultation", lastMessage: "", lastMessageAt: "",
  canSend: true, communicationState: "AVAILABLE",
};
const view = (changes: Partial<React.ComponentProps<typeof ChatWindow>> = {}) => renderToString(
  <ChatWindow conversation={conversation} messages={[]} currentUserId="p1"
    loading={false} sending={false} error="" sendError="" onSendMessage={vi.fn()}
    onOpenVideoCall={vi.fn()} onBackToList={vi.fn()} onReload={vi.fn()} {...changes} />);

describe("HTTP-backed communication interface", () => {
  it("starts with loading and no fabricated participants or gateway claims", () => {
    const html = renderToString(<MemoryRouter><CommunicationPage /></MemoryRouter>);
    expect(html).toContain("Loading conversations");
    for (const text of ["Demo Patient", "18ms", "AES-256", "Realtime Synced", "Encrypted Records", "LIVE CALL", "Daily.co WebRTC Ready"]) {
      expect(html).not.toContain(text);
    }
  });
  it("denies unsupported roles before fetching communication", () => {
    user = { id: "a1", roles: ["UNSUPPORTED"] };
    const html = renderToString(<MemoryRouter><CommunicationPage /></MemoryRouter>);
    expect(html).toContain("Sign in to access communication");
    user = { id: "p1", roles: ["PATIENT"] };
  });
  it("shows a real empty list without demo fallback", () => {
    expect(renderToString(<ConversationList conversations={[]} activeConversationId={null}
      onSelectConversation={vi.fn()} />)).toContain("No conversations yet");
  });
  it("shows expired history read-only and blocks composing", () => {
    const expired = { ...conversation, communicationState: "EXPIRED" as const };
    const html = view({ conversation: expired });
    expect(html).toContain("Messaging window expired");
    expect(html).toMatch(/textarea[^>]*disabled/);
    expect(canCompose(expired)).toBe(false);
    expect(canCompose({ ...conversation, canSend: false })).toBe(false);
  });
  it("does not expose unsupported attachments, prescriptions, presence or receipts", () => {
    const html = view();
    for (const text of ["Attach", "Prescription", "Delivered", "Online", "Verified"]) {
      expect(html).not.toContain(text);
    }
    expect(html).toContain("No messages yet");
  });
  it("disables call entry unless the server explicitly permits it", () => {
    const linked = { ...conversation, linkedConsultation: { appointmentId: "a1" } };
    expect(view({ conversation: linked })).toMatch(/button[^>]*aria-label="Open video consultation"[^>]*disabled/);
    expect(view({ conversation: { ...linked, videoAvailable: true } }))
      .toContain("Open video consultation");
  });
  it("renders server errors instead of a composer or stale history", () => {
    const html = view({ conversation: null, error: "You are not authorized to access this conversation." });
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("textarea");
  });
  it("compares sender IDs rather than inferring ownership from role", () => {
    const html = view({ messages: [{ id: "m1", conversationId: "c1", senderId: "other",
      senderName: "Other patient", senderRole: "PATIENT", text: "Server message",
      timestamp: "2026-11-03T10:00:00Z" }] });
    expect(html).toContain("Other patient");
    expect(html).toContain("Server message");
    expect(html).not.toContain(">You<");
  });
});
