import { AppError } from "../../../utils/app-error";
import type { AuthUser } from "../../auth/auth.types";
import type { VideoProvider } from "../../appointments/video-provider";
import { CallAccess } from "./call.access";
import { CallStore } from "./call.store";
import { effectiveCallStatus, type CallAction } from "./call.policy";
import type { CallMedia } from "./call.entity";

export class CallService {
  constructor(readonly store: CallStore, private readonly access: CallAccess, private readonly provider?: VideoProvider,
    private readonly now: () => Date = () => new Date()) {}
  get available() { return Boolean(this.provider); }
  async start(user: AuthUser, reference: string, media: CallMedia, key: string) {
    if (!this.provider) throw new AppError(503, "CALLS_UNAVAILABLE", "Calls are unavailable until the video service is configured");
    const access = await this.access.resolve(reference, user), now = this.now();
    const id = await this.store.create({ reference, callerId: user.id, calleeId: access.peerId, media, key,
      expiresAt: new Date(Math.min(now.getTime() + 45000, access.closesAt?.getTime() ?? Infinity)) }, now);
    return this.store.view(await this.store.get(id, user.id), now);
  }
  async action(user: AuthUser, id: string, action: CallAction) {
    const call = await this.store.get(id, user.id);
    const access = action === "accept" ? await this.access.resolve(call.conversationRef, user) : null;
    return this.store.view(await this.store.act(id, user.id, action, this.now(), access?.closesAt), this.now());
  }
  async room(user: AuthUser, id: string) {
    const call = await this.store.get(id, user.id), now = this.now();
    if (!this.provider) throw new AppError(503, "CALLS_UNAVAILABLE", "Calling service is unavailable");
    if (effectiveCallStatus(call, now) !== "ACCEPTED") throw new AppError(409, "CALL_NOT_ACCEPTED", "The call is not accepted or has ended");
    const access = await this.access.resolve(call.conversationRef, user);
    try {
      const credentials = await this.provider.createSession({ appointmentId: call.id,
        roomName: access.roomName ?? `mediconnect-call-${call.id}`, opensAt: now, closesAt: call.expiresAt,
        participant: { identity: user.id, name: `${user.firstName} ${user.lastName}`, role: user.roles.includes("ADMIN") ? "ADMIN" :
          user.roles.includes("DOCTOR") ? "DOCTOR" : "PATIENT", isOwner: false }, audioOnly: call.media === "AUDIO" });
      if (credentials.provider !== "daily") throw Error("Live provider required");
      return { ...credentials, expiresAt: call.expiresAt.toISOString(), media: call.media };
    } catch { throw new AppError(503, "CALL_PROVIDER_UNAVAILABLE", "The calling service could not open the room. Try again."); }
  }
  active(user: AuthUser) { return this.store.list(user.id, this.now(), undefined, true); }
  history(user: AuthUser, reference?: string) { return this.store.list(user.id, this.now(), reference); }
}
