import { describe, expect, it, vi } from "vitest";
import { DailyVideoProvider } from "../src/modules/appointments/video-provider";

describe("Direct call Daily permissions", () => {
  it.each([true, false])("keeps voice-only permissions separate from video (audioOnly=%s)", async (audioOnly) => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: "https://synthetic.daily.co/room" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "synthetic-token" })));
    const provider = new DailyVideoProvider("synthetic-key", undefined, fetcher);
    await provider.createSession({ appointmentId: "synthetic-call", roomName: "synthetic-room", audioOnly,
      opensAt: new Date("2026-11-04T12:00:00Z"), closesAt: new Date("2026-11-04T12:30:00Z"),
      participant: { identity: "synthetic-admin", name: "Support Agent", role: "ADMIN", isOwner: false } });
    const token = JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body)).properties;
    expect(token.is_owner).toBe(false);
    expect(token.room_name).toBe("synthetic-room");
    if (audioOnly) {
      expect(token.start_video_off).toBe(true);
      expect(token.enable_screenshare).toBe(false);
      expect(token.permissions.canSend).toEqual(["audio"]);
    } else {
      expect(token.start_video_off).toBeUndefined();
      expect(token.permissions).toBeUndefined();
    }
  });
});
