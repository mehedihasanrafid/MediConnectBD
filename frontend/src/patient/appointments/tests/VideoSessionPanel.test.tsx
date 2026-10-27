import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { VideoSession } from "../../../shared/types";
import { VideoSessionPanel } from "../components/VideoSessionPanel";

vi.mock("../../../api/appointments", () => ({
  appointmentsApi: {
    getVideoSession: vi.fn(),
  },
}));

describe("VideoSessionPanel", () => {
  const dummyDailySession: VideoSession = {
    appointmentId: "appt-video-123",
    roomName: "mediconnect-consult-appt-video-123",
    roomUrl: "https://myclinic.daily.co/mediconnect-consult-appt-video-123",
    accessToken: "live_daily_token_45678",
    participantRole: "PATIENT",
    participantName: "Test Patient",
    doctorName: "Dr. Demo Doctor",
    patientName: "Test Patient",
    scheduledStartAt: "2026-10-27T10:00:00.000Z",
    scheduledEndAt: "2026-10-27T10:20:00.000Z",
    opensAt: "2026-10-27T09:55:00.000Z",
    closesAt: "2026-10-27T10:20:00.000Z",
  };

  const dummyMockSession: VideoSession = {
    ...dummyDailySession,
    roomUrl: "https://mediconnect.daily.co/mock/mediconnect-consult-appt-video-123",
    accessToken: "mock_daily_token_45678",
  };

  it("embeds real Daily.co WebRTC call in an iframe with permissions and token", () => {
    const html = renderToString(
      <VideoSessionPanel
        appointmentId="appt-video-123"
        initialSession={dummyDailySession}
        onClose={() => {}}
      />,
    );

    // Verify iframe with camera/mic permissions
    expect(html).toContain("<iframe");
    expect(html).toContain('allow="camera; microphone; fullscreen; display-capture; autoplay"');
    expect(html).toContain("https://myclinic.daily.co/mediconnect-consult-appt-video-123?t=live_daily_token_45678");

    // Live video indicator
    expect(html).toContain("Live Video Active");

    // Chat and collaboration tabs
    expect(html).toContain("Video Call &amp; In-call Chat");
    expect(html).toContain("Consultation Files &amp; Reports");
    expect(html).toContain("In-call text chat, screen sharing, and audio/video controls are active");

    // Does not show legacy false text
    expect(html).not.toContain("Secure WebRTC / Twilio-backed room");
  });

  it("renders development mock mode when Daily API key is not configured without claiming secure WebRTC", () => {
    const html = renderToString(
      <VideoSessionPanel
        appointmentId="appt-video-123"
        initialSession={dummyMockSession}
        onClose={() => {}}
      />,
    );

    // Development mode indicator
    expect(html).toContain("Development Mock Mode");
    expect(html).toContain("Daily API keys are not configured in backend environment");

    // Does not claim live or secure WebRTC
    expect(html).not.toContain("Live Video Active");
    expect(html).not.toContain("Secure WebRTC");
  });
});
