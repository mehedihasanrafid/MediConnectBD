import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "../../shared/ui";
import type { Conversation } from "../types";
import { callApi, type CommunicationCall } from "../calls/callApi";
import styles from "../CommunicationPage.module.css";

const time = (value: string) => new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" });
export function ConversationDetails({ conversation, onClose }: { conversation: Conversation; onClose: () => void }) {
  const [history, setHistory] = useState<CommunicationCall[] | null>(null), [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false), [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!showHistory) return;
    let active = true;
    callApi.history(conversation.id).then((result) => { if (active) setHistory(result.items); })
      .catch(() => { if (active) setError("Call history could not be loaded."); });
    return () => { active = false; };
  }, [conversation.id, showHistory, revision]);
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={styles.drawer}>
      <div className={styles.topBar}><Dialog.Title>Conversation details</Dialog.Title>
        <Dialog.Close className={styles.iconButton} aria-label="Close conversation details"><X size={18} /></Dialog.Close></div>
      <Dialog.Description className={styles.muted}>{conversation.participantName}</Dialog.Description>
      <div className={styles.stack}>
        <dl className={styles.facts}>
          <div><dt>Type</dt><dd>{conversation.kind === "COLLEAGUE" ? "Colleague" : conversation.kind === "SUPPORT" ? "Support" :
            conversation.kind === "STAFF" ? "Staff" : "Consultation"}</dd></div>
          {conversation.beneficiary && <div><dt>Patient</dt><dd>{conversation.beneficiary.name} · {conversation.beneficiary.relationship}</dd></div>}
          {conversation.scheduledStartAt && <div><dt>Appointment</dt><dd>{time(conversation.scheduledStartAt)}</dd></div>}
          {conversation.appointmentMode && <div><dt>Consultation</dt><dd>{conversation.appointmentMode === "VIDEO" ? "Video" : "Chamber"}</dd></div>}
          {conversation.appointmentStatus && <div><dt>Booking status</dt><dd>{conversation.appointmentStatus}</dd></div>}
          {conversation.entitlement && <div><dt>Messaging until</dt><dd>{time(conversation.entitlement.windowExpiresAt)}</dd></div>}
        </dl>
        <Button size="sm" variant="secondary" onClick={() => setShowHistory((value) => !value)}>Call history</Button>
        {showHistory && (error ? <div role="alert">{error}<Button size="sm" variant="ghost" onClick={() => { setError(""); setRevision((n) => n + 1); }}>Retry</Button></div> :
          !history ? <p role="status">Loading call history…</p> : !history.length ? <p className={styles.muted}>No calls yet.</p> :
            history.map((call) => <div className={styles.historyRow} key={call.id}>
              <strong>{call.media === "AUDIO" ? "Voice" : "Video"} · {call.status.toLowerCase()}</strong>
              <span className={styles.muted}>{time(call.createdAt)}</span>
            </div>))}
      </div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
