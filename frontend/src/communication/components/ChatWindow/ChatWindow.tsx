import { ArrowLeft, Info, Phone, RotateCw, Video } from "lucide-react";
import { Avatar, Button } from "../../../shared/ui";
import { canCompose, type ChatMessage, type Conversation } from "../../types";
import { useCalls } from "../../calls/CallContext";
import { MessageComposer } from "../MessageComposer/MessageComposer";
import { MessageHistory } from "../MessageHistory/MessageHistory";
import styles from "./ChatWindow.module.css";

interface ChatWindowProps {
  conversation: Conversation | null; messages: ChatMessage[]; currentUserId: string;
  loading: boolean; error: string; sendError: string; sending: boolean;
  onSendMessage: (text: string) => Promise<boolean>; onOpenVideoCall: (appointmentId: string) => void;
  onBackToList: () => void; onReload: () => void; onOpenDetails?: () => void;
  onLoadOlder?: () => void; hasOlder?: boolean; olderError?: string; olderBusy?: boolean;
}
export function ChatWindow(props: ChatWindowProps) {
  const { conversation, messages, currentUserId, loading, error, sendError, sending } = props;
  const calls = useCalls();
  const canSend = canCompose(conversation), appointmentId = conversation?.linkedConsultation?.appointmentId;
  const direct = Boolean(conversation?.id.startsWith("direct:"));
  const eligible = direct ? canSend : conversation?.videoAvailable === true;
  const canCall = eligible && calls?.available === true && !calls.busy;
  const subtitle = conversation?.beneficiary ? `Patient: ${conversation.beneficiary.name} · ${conversation.beneficiary.relationship}` : conversation?.participantSubtitle;
  return <section className={styles.container} aria-label="Conversation">
    <header className={styles.chatHeader}>
      <div className={styles.headerInfo}>
        <button type="button" className={styles.mobileBackBtn} onClick={props.onBackToList} aria-label="Back to conversations list"><ArrowLeft size={18} /></button>
        {conversation && <Avatar name={conversation.participantName} src={conversation.participantAvatarUrl} size="md" />}
        <div className={styles.participantDetails}><h2 className={styles.participantName}>{conversation?.participantName ?? "Messages"}</h2>
          {conversation && <p className={styles.participantSubtitle} title={subtitle}>{subtitle}</p>}
        </div>
      </div>
      <div className={styles.headerActions}>
        {conversation && <>
          <button type="button" className={styles.detailsBtn} aria-label="Voice call" disabled={!canCall}
            title={canCall ? "Start a voice call" : "Calling is unavailable or outside the appointment window"}
            onClick={() => void calls?.start(conversation.id, "AUDIO")}><Phone size={16} /></button>
          <button type="button" className={styles.videoBtn} aria-label={direct ? "Video call" : "Open video consultation"}
            disabled={direct ? !canCall : !eligible || !appointmentId}
            title={direct ? "Start a video call" : "Open authorized appointment video room"}
            onClick={() => { if (direct) void calls?.start(conversation.id, "VIDEO"); else if (appointmentId) props.onOpenVideoCall(appointmentId); }}>
            <Video size={16} /><span>Video</span>
          </button>
          <button type="button" className={styles.detailsBtn} aria-label="Conversation details" onClick={props.onOpenDetails}><Info size={16} /></button>
        </>}
        <button type="button" className={styles.detailsBtn} aria-label="Refresh" onClick={props.onReload} disabled={loading || sending}><RotateCw size={15} /></button>
      </div>
    </header>
    {error && <p role="alert">{error}</p>}
    {loading && !conversation ? <p role="status">Loading message history…</p> : conversation ? <>
      {props.olderError && <p role="alert">Could not load earlier history. {props.olderError}</p>}
      {props.hasOlder && <Button size="sm" variant="ghost" disabled={props.olderBusy} onClick={props.onLoadOlder}>
        {props.olderBusy ? "Loading earlier messages…" : "Load earlier messages"}
      </Button>}
      <MessageHistory messages={messages} currentUserId={currentUserId} />
      {!canSend && <p role="status" className={styles.participantSubtitle}>{conversation.communicationState === "EXPIRED"
        ? "Messaging window expired · history is read-only" : conversation.unavailableReason || "Messaging is unavailable."}</p>}
      {sendError && <p role="alert">{sendError} Your message was not confirmed; your draft is kept.</p>}
      <MessageComposer key={conversation.id} disabled={!canSend} sending={sending} onSend={props.onSendMessage} />
    </> : !error && <div className={styles.emptySelection}>Select a conversation to view messages.</div>}
  </section>;
}
