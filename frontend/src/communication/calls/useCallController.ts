import { useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../../shared/utils/apiError";
import { callApi, type CallAction, type CommunicationCall } from "./callApi";

export function useCallController(userId: string | undefined) {
  const [call, setCall] = useState<CommunicationCall | null>(null);
  const [available, setAvailable] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [roomOpen, setRoomOpen] = useState(false);
  const current = useRef<CommunicationCall | null>(null), lock = useRef(false);
  useEffect(() => { current.current = call; }, [call]);
  useEffect(() => { setRoomOpen(false); }, [call?.id]);
  useEffect(() => {
    let cancelled = false, pending = false;
    if (!userId) return;
    callApi.capabilities().then((result) => { if (!cancelled) setAvailable(result.callsAvailable === true); }).catch(() => {});
    async function poll() {
      if (pending) return;
      pending = true;
      try {
        const response = await callApi.active();
        if (cancelled) return;
        const active = response.items[0];
        if (active) setCall(active);
        else if (current.current && ["RINGING", "ACCEPTED"].includes(current.current.status)) {
          const final = await callApi.detail(current.current.id);
          if (!cancelled) { setCall(final); setRoomOpen(false); }
        }
      } catch { /* A failed poll never invents a call or an ended state. */ }
      finally { pending = false; }
    }
    void poll();
    const timer = window.setInterval(() => void poll(), 3000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [userId]);
  async function start(conversationId: string, media: "AUDIO" | "VIDEO") {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { setCall(await callApi.start(conversationId, media, crypto.randomUUID())); }
    catch (caught) { setError(getErrorMessage(caught, "Could not start the call.")); }
    finally { lock.current = false; setBusy(false); }
  }
  async function action(action: CallAction) {
    if (!call || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    if (["end", "cancel", "decline"].includes(action)) setRoomOpen(false);
    try { setCall(await callApi.action(call.id, action)); }
    catch (caught) { setError(getErrorMessage(caught, "Could not update the call. Try again.")); }
    finally { lock.current = false; setBusy(false); }
  }
  function close() {
    if (!call) { setError(""); return; }
    if (call.status === "RINGING") { void action(call.caller.userId === userId ? "cancel" : "decline"); return; }
    if (call.status === "ACCEPTED") { void action("end"); return; }
    setCall(null); setError(""); setRoomOpen(false);
  }
  return { call, available, busy, error, roomOpen, start, action, close, openRoom: () => setRoomOpen(true) };
}
