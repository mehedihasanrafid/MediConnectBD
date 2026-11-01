import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { VideoSession } from "../../../../../../../shared/types";
import { VideoPreCallLobby } from "../VideoPreCallLobby";

describe("VideoPreCallLobby", () => {
  const dummySession: VideoSession = {
    appointmentId: "appt-lobby-1",
    roomName: "mediconnect-consult-lobby-1",
    roomUrl: "https://mediconnectbd.daily.co/mediconnect-consult-lobby-1",
    accessToken: "jwt_lobby_token_123",
    participantRole: "PATIENT",
    participantName: "Tariqul Islam",
    doctorName: "Mahmudur Rahman",
    patientName: "Tariqul Islam",
    scheduledStartAt: "2026-11-01T14:00:00.000Z",
    scheduledEndAt: "2026-11-01T14:30:00.000Z",
    opensAt: "2026-11-01T13:55:00.000Z",
    closesAt: "2026-11-01T14:30:00.000Z",
  };

  it("renders pre-flight check title, participant names, and device checks", () => {
    const html = renderToString(
      <VideoPreCallLobby
        session={dummySession}
        onJoinRoom={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // Header and titles
    expect(html).toContain("Telehealth Pre-Flight Device Check");
    expect(html).toContain("Dr. Mahmudur Rahman");

    // Camera and audio diagnostics
    expect(html).toContain("Microphone Volume Check");
    expect(html).toContain("Audio &amp; Speaker");
    expect(html).toContain("Test Sound");

    // Consultation info card
    expect(html).toContain("AES-256 WebRTC");

    // Main action buttons
    expect(html).toContain("Enter Consultation Room");
    expect(html).toContain("Cancel &amp; Exit");
  });
});
