import { useEffect, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Phone, Video, X } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { Alert, Button } from "../../shared/ui";
import { useCallController } from "./useCallController";
import { CallRoom } from "./CallRoom";
import { CallContext } from "./CallContext";
import { playChimeSound } from "../../shared/utils/sound";
import styles from "./Calls.module.css";

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <CallSession key={user?.id ?? "guest"} userId={user?.id}>{children}</CallSession>;
}
function CallSession({ userId, children }: { userId: string | undefined; children: ReactNode }) {
  const controller = useCallController(userId);
  const { call, error, busy, action, close } = controller;
  const incoming = call?.callee.userId === userId, ringing = call?.status === "RINGING";
  const name = call ? incoming ? call.caller.name : call.callee.name : "";
  const Icon = call?.media === "AUDIO" ? Phone : Video;
  useEffect(() => {
    if (!incoming || !ringing) return;
    playChimeSound("call");
    const timer = window.setInterval(() => playChimeSound("call"), 6000);
    return () => clearInterval(timer);
  }, [call?.id, incoming, ringing]);
  return <CallContext.Provider value={controller}>
    {children}
    {(call || error) && <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) close(); }}>
      <Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={styles.dialog}>
        <div className={styles.header}><div><Dialog.Title>
          <Icon size={18} aria-hidden="true" /> {ringing ? incoming ? "Incoming" : "Outgoing" : ""} {call?.media === "AUDIO" ? "voice" : "video"} call
        </Dialog.Title><Dialog.Description>{name || "Calling service"}</Dialog.Description></div>
          <button type="button" disabled={busy} onClick={close} aria-label="Close call" className={styles.close}><X size={18} /></button>
        </div>
        {error && <Alert kind="error">{error}</Alert>}
        {call && <div className={styles.body}>
          <p role="status">{ringing ? incoming ? "Someone is calling you." : "Ringing…" : call.status === "ACCEPTED" ? "Call accepted" :
            call.status === "MISSED" ? "Missed call" : call.status === "DECLINED" ? "Call declined" : call.status === "CANCELLED" ? "Call cancelled" : "Call ended"}</p>
          {call.status === "ACCEPTED" && controller.roomOpen && <CallRoom call={call} />}
          <div className={styles.actions}>
            {ringing && incoming ? <>
              <Button variant="danger" disabled={busy} onClick={() => void action("decline")}>Decline</Button>
              <Button loading={busy} onClick={() => void action("accept")}>Accept</Button>
            </> : ringing ? <Button variant="danger" loading={busy} onClick={() => void action("cancel")}>Cancel call</Button> :
              call.status === "ACCEPTED" ? <>
                {!controller.roomOpen && <Button disabled={busy} onClick={controller.openRoom}>Enter call</Button>}
                <Button variant="danger" loading={busy} onClick={() => void action("end")}>End call</Button>
              </> : <Button variant="secondary" onClick={close}>Close</Button>}
          </div>
        </div>}
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>}
  </CallContext.Provider>;
}
