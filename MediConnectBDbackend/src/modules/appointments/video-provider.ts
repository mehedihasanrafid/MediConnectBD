/**
 * Video consultation provider interface and implementations. Separates Daily.co REST/WebRTC
 * credential generation from database repositories and business logic.
 */

import { createHmac } from "node:crypto";
import { AppError } from "../../utils/app-error";

export interface VideoSessionParticipant {
  identity: string;
  name: string;
  role: "DOCTOR" | "PATIENT";
  isOwner: boolean;
}

export interface CreateVideoSessionInput {
  appointmentId: string;
  roomName: string;
  opensAt: Date;
  closesAt: Date;
  participant: VideoSessionParticipant;
}

export interface VideoSessionCredentials {
  roomName: string;
  roomUrl: string;
  accessToken: string;
  provider: "daily" | "mock";
}

export interface VideoProvider {
  createSession(input: CreateVideoSessionInput): Promise<VideoSessionCredentials>;
}

/**
 * In-memory / development mock video provider when Daily API keys are not configured.
 */
export class MockVideoProvider implements VideoProvider {
  constructor(private readonly domain: string = "mediconnect.daily.co") {}

  async createSession(input: CreateVideoSessionInput): Promise<VideoSessionCredentials> {
    const payload = Buffer.from(
      JSON.stringify({
        sub: input.participant.identity,
        name: input.participant.name,
        role: input.participant.role,
        is_owner: input.participant.isOwner,
        room: input.roomName,
        exp: Math.floor(input.closesAt.getTime() / 1000),
      }),
    ).toString("base64url");
    const signature = createHmac("sha256", "mock-video-room-secret")
      .update(payload)
      .digest("base64url");

    return {
      roomName: input.roomName,
      roomUrl: `https://${this.domain}/${input.roomName}`,
      accessToken: `mock_daily_${payload}.${signature}`,
      provider: "mock",
    };
  }
}

/**
 * Production Daily.co provider: creates ephemeral private rooms with expiry and
 * generates role-based meeting tokens (doctor = moderator/owner, patient = attendee).
 */
export class DailyVideoProvider implements VideoProvider {
  constructor(
    private readonly apiKey: string,
    private readonly configuredDomain?: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async createSession(input: CreateVideoSessionInput): Promise<VideoSessionCredentials> {
    const expSeconds = Math.floor(input.closesAt.getTime() / 1000);

    // 1. Ensure private room exists with auto-expiry
    let roomUrl = this.configuredDomain
      ? `https://${this.configuredDomain}.daily.co/${input.roomName}`
      : "";

    const roomResponse = await this.fetchFn("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.roomName,
        privacy: "private",
        properties: {
          exp: expSeconds,
          enable_chat: true,
          enable_screenshare: true,
          eject_at_room_exp: true,
        },
      }),
    });

    if (roomResponse.ok) {
      const roomData = (await roomResponse.json()) as { url?: string };
      if (roomData.url) {
        roomUrl = roomData.url;
      }
    } else if (roomResponse.status === 400) {
      // Room already exists; fetch its details or use constructed domain URL
      const getResponse = await this.fetchFn(
        `https://api.daily.co/v1/rooms/${encodeURIComponent(input.roomName)}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );
      if (getResponse.ok) {
        const existingData = (await getResponse.json()) as { url?: string };
        if (existingData.url) {
          roomUrl = existingData.url;
        }
      }
    } else {
      const errorText = await roomResponse.text();
      throw new AppError(
        502,
        "VIDEO_PROVIDER_ERROR",
        `Daily.co room creation failed with status ${roomResponse.status}: ${errorText}`,
      );
    }

    if (!roomUrl) {
      roomUrl = `https://api.daily.co/${input.roomName}`;
    }

    // 2. Generate meeting token with specific participant role & expiry
    const tokenResponse = await this.fetchFn("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name: input.roomName,
          user_name: input.participant.name,
          user_id: input.participant.identity,
          is_owner: input.participant.isOwner,
          enable_screenshare: true,
          exp: expSeconds,
        },
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new AppError(
        502,
        "VIDEO_PROVIDER_TOKEN_ERROR",
        `Daily.co token generation failed with status ${tokenResponse.status}: ${errorText}`,
      );
    }

    const tokenData = (await tokenResponse.json()) as { token: string };

    return {
      roomName: input.roomName,
      roomUrl,
      accessToken: tokenData.token,
      provider: "daily",
    };
  }
}
