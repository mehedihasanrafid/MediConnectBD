import { describe, expect, it, vi } from "vitest";
import {
  DailyVideoProvider,
  MockVideoProvider,
  type VideoProvider,
} from "../src/modules/appointments/video-provider";
import { AppointmentService } from "../src/modules/appointments/appointment.service";
import type { AppointmentRepository } from "../src/modules/appointments/appointment.repository";
import type {
  AppointmentVideoEligibilityResult,
  VideoSessionView,
} from "../src/modules/appointments/appointment.types";

describe("VideoProvider & Video Session Backend Contract", () => {
  const baseSessionInput = {
    appointmentId: "appt-video-1",
    roomName: "mediconnect-consult-appt-video-1",
    opensAt: new Date("2026-10-27T10:00:00.000Z"),
    closesAt: new Date("2026-10-27T10:30:00.000Z"),
  };

  describe("MockVideoProvider", () => {
    it("generates deterministic credentials and distinct tokens for doctor and patient", async () => {
      const provider = new MockVideoProvider("custom.daily.co");

      const doctorSession = await provider.createSession({
        ...baseSessionInput,
        participant: {
          identity: "doc-1",
          name: "Dr. Doctor",
          role: "DOCTOR",
          isOwner: true,
        },
      });

      const patientSession = await provider.createSession({
        ...baseSessionInput,
        participant: {
          identity: "pat-1",
          name: "Patient One",
          role: "PATIENT",
          isOwner: false,
        },
      });

      expect(doctorSession.roomName).toBe("mediconnect-consult-appt-video-1");
      expect(doctorSession.roomUrl).toBe("https://custom.daily.co/mediconnect-consult-appt-video-1");
      expect(doctorSession.accessToken).toContain("mock_daily_");
      expect(doctorSession.provider).toBe("mock");

      expect(patientSession.roomName).toBe("mediconnect-consult-appt-video-1");
      // Distinct tokens for distinct participants/roles
      expect(doctorSession.accessToken).not.toBe(patientSession.accessToken);
    });
  });

  describe("DailyVideoProvider", () => {
    it("makes correct REST API requests to Daily.co for room and meeting token", async () => {
      const mockFetch = vi.fn();

      // Mock room creation response
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "room-id-123",
            name: "mediconnect-consult-appt-video-1",
            url: "https://myclinic.daily.co/mediconnect-consult-appt-video-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      // Mock token generation response
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "daily_jwt_token_doctor_123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const provider = new DailyVideoProvider("test-daily-api-key", "myclinic", mockFetch as any);

      const session = await provider.createSession({
        ...baseSessionInput,
        participant: {
          identity: "doc-100",
          name: "Dr. Anisur Rahman",
          role: "DOCTOR",
          isOwner: true,
        },
      });

      expect(session.roomName).toBe("mediconnect-consult-appt-video-1");
      expect(session.roomUrl).toBe("https://myclinic.daily.co/mediconnect-consult-appt-video-1");
      expect(session.accessToken).toBe("daily_jwt_token_doctor_123");
      expect(session.provider).toBe("daily");

      // Verify room request payload
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "https://api.daily.co/v1/rooms",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-daily-api-key",
            "Content-Type": "application/json",
          },
        }),
      );

      const roomBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(roomBody.name).toBe("mediconnect-consult-appt-video-1");
      expect(roomBody.privacy).toBe("private");
      expect(roomBody.properties.exp).toBe(Math.floor(baseSessionInput.closesAt.getTime() / 1000));
      expect(roomBody.properties.enable_chat).toBe(true);

      // Verify token request payload
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "https://api.daily.co/v1/meeting-tokens",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-daily-api-key",
            "Content-Type": "application/json",
          },
        }),
      );

      const tokenBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(tokenBody.properties.room_name).toBe("mediconnect-consult-appt-video-1");
      expect(tokenBody.properties.user_id).toBe("doc-100");
      expect(tokenBody.properties.is_owner).toBe(true);
    });

    it("handles pre-existing rooms gracefully on HTTP 400", async () => {
      const mockFetch = vi.fn();

      // Room creation returns 400 (already exists)
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "room-already-exists" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      );

      // Subsequent GET room returns room details
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            name: "mediconnect-consult-appt-video-1",
            url: "https://myclinic.daily.co/mediconnect-consult-appt-video-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      // Token creation returns token
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "patient_token_456" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const provider = new DailyVideoProvider("test-daily-api-key", "myclinic", mockFetch as any);

      const session = await provider.createSession({
        ...baseSessionInput,
        participant: {
          identity: "pat-200",
          name: "Karim Ahmed",
          role: "PATIENT",
          isOwner: false,
        },
      });

      expect(session.roomUrl).toBe("https://myclinic.daily.co/mediconnect-consult-appt-video-1");
      expect(session.accessToken).toBe("patient_token_456");
    });
  });

  describe("AppointmentService.getVideoSession with VideoProvider", () => {
    const fixedNow = new Date("2026-10-27T10:02:00.000Z");

    const mockEligibility: AppointmentVideoEligibilityResult = {
      kind: "OK",
      details: {
        appointmentId: "appt-999",
        doctorProfileId: "doc-profile-1",
        patientProfileId: "pat-profile-1",
        doctorName: "Dr. Fatima",
        patientName: "Rahim",
        participantRole: "PATIENT",
        participantName: "Rahim",
        participantIdentity: "pat-profile-1",
        scheduledStartAt: new Date("2026-10-27T10:00:00.000Z"),
        scheduledEndAt: new Date("2026-10-27T10:20:00.000Z"),
        opensAt: new Date("2026-10-27T09:55:00.000Z"),
        closesAt: new Date("2026-10-27T10:20:00.000Z"),
      },
    };

    it("returns provider credentials for booked participant", async () => {
      const mockRepo: Partial<AppointmentRepository> = {
        getAppointmentForVideoSession: vi.fn().mockResolvedValue(mockEligibility),
      };

      const customProvider: VideoProvider = {
        createSession: vi.fn().mockResolvedValue({
          roomName: "custom-room-999",
          roomUrl: "https://daily.co/custom-room-999",
          accessToken: "token-abc-123",
          provider: "daily",
        }),
      };

      const service = new AppointmentService(
        mockRepo as AppointmentRepository,
        null,
        () => fixedNow,
        customProvider,
      );

      const session = await service.getVideoSession("appt-999", {
        patientProfileId: "pat-profile-1",
      });

      expect(session.roomName).toBe("custom-room-999");
      expect(session.roomUrl).toBe("https://daily.co/custom-room-999");
      expect(session.accessToken).toBe("token-abc-123");
      expect(session.participantRole).toBe("PATIENT");
      expect(session.patientName).toBe("Rahim");
    });

    it("rejects unauthorized participants", async () => {
      const mockRepo: Partial<AppointmentRepository> = {
        getAppointmentForVideoSession: vi.fn().mockResolvedValue({
          kind: "APPOINTMENT_FORBIDDEN",
        }),
      };

      const service = new AppointmentService(
        mockRepo as AppointmentRepository,
        null,
        () => fixedNow,
      );

      await expect(
        service.getVideoSession("appt-999", {
          patientProfileId: "attacker-patient-id",
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "APPOINTMENT_FORBIDDEN",
      });
    });

    it("rejects calls outside the 5-minute video window", async () => {
      const mockRepo: Partial<AppointmentRepository> = {
        getAppointmentForVideoSession: vi.fn().mockResolvedValue({
          kind: "VIDEO_WINDOW_CLOSED",
          opensAt: new Date("2026-10-27T09:55:00.000Z"),
          closesAt: new Date("2026-10-27T10:20:00.000Z"),
          scheduledStartAt: new Date("2026-10-27T10:00:00.000Z"),
          scheduledEndAt: new Date("2026-10-27T10:20:00.000Z"),
        }),
      };

      const service = new AppointmentService(
        mockRepo as AppointmentRepository,
        null,
        () => new Date("2026-10-27T08:00:00.000Z"),
      );

      await expect(
        service.getVideoSession("appt-999", {
          patientProfileId: "pat-profile-1",
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: "VIDEO_SESSION_WINDOW_CLOSED",
      });
    });
  });
});
