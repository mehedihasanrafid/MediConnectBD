import { useEffect, useState } from "react";
import { Alert, Button } from "../../shared/ui";
import { getErrorMessage } from "../../shared/utils/apiError";
import { callApi, type CallRoom as Room, type CommunicationCall } from "./callApi";
import styles from "./Calls.module.css";

export function CallRoom({ call }: { call: CommunicationCall }) {
  const [room, setRoom] = useState<Room | null>(null), [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    callApi.room(call.id).then((result) => {
      const url = new URL(result.roomUrl);
      if (url.protocol !== "https:" || result.provider !== "daily" || !result.accessToken) throw Error("The call room is unavailable.");
      if (!cancelled) setRoom(result);
    }).catch((caught) => { if (!cancelled) setError(getErrorMessage(caught, "Could not open the call room.")); });
    return () => { cancelled = true; };
  }, [call.id, revision]);
  if (error) return <Alert kind="error">{error}<Button size="sm" variant="ghost" onClick={() => { setError(""); setRevision((n) => n + 1); }}>Retry room</Button></Alert>;
  if (!room) return <p role="status">Opening call room…</p>;
  const url = new URL(room.roomUrl);
  url.searchParams.set("t", room.accessToken);
  return <iframe className={styles.frame} src={url.href} title={call.media === "AUDIO" ? "Voice call room" : "Video call room"}
    allow={call.media === "AUDIO" ? "microphone; autoplay" : "camera; microphone; fullscreen; display-capture; autoplay"}
    referrerPolicy="no-referrer" />;
}
