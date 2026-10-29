import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCheck,
  FileText,
  Info,
  Paperclip,
  Send,
  ShieldCheck,
  Video,
} from "lucide-react";
import { Avatar } from "../../../shared/ui";
import type { ChatMessage, Conversation } from "../../types";
import styles from "./ChatWindow.module.css";

interface ChatWindowProps {
  conversation: Conversation | null;
  messages: ChatMessage[];
  currentUserId: string;
  currentUserRole: "DOCTOR" | "PATIENT";
  onSendMessage: (text: string, attachments?: ChatMessage["attachments"]) => void;
  onOpenVideoCall: (appointmentId: string) => void;
  onToggleDrawer: () => void;
  isDrawerOpen: boolean;
  onBackToList?: () => void;
}

export function ChatWindow({
  conversation,
  messages,
  currentUserId,
  currentUserRole,
  onSendMessage,
  onOpenVideoCall,
  onToggleDrawer,
  isDrawerOpen,
  onBackToList,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const messageAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
    }
  }, [messages]);

  if (!conversation) {
    return (
      <div className={styles.emptySelection}>
        <p>Select a consultation from the left to start messaging.</p>
      </div>
    );
  }

  const isLive = conversation.status === "LIVE_CONSULTATION";
  const appointmentId = conversation.linkedConsultation?.appointmentId;

  function handleSend() {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  }

  function handleAttachSimulatedReport() {
    onSendMessage("Attached consultation document for review:", [
      {
        id: `att-sim-${Date.now()}`,
        name: currentUserRole === "DOCTOR" ? "Clinical_Summary_Note.pdf" : "Blood_Test_Report_Oct2026.pdf",
        type: "PDF",
        size: "340 KB",
      },
    ]);
  }

  return (
    <div className={styles.container}>
      {/* Sleek Chat Header */}
      <div className={styles.chatHeader}>
        <div className={styles.headerInfo}>
          {onBackToList && (
            <button
              type="button"
              className={styles.mobileBackBtn}
              onClick={onBackToList}
              aria-label="Back to conversations list"
            >
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
          )}
          <Avatar name={conversation.participantName} size="md" />
          <div className={styles.participantDetails}>
            <h3 className={styles.participantName}>
              <span>{conversation.participantName}</span>
              {conversation.participantRole === "DOCTOR" && (
                <ShieldCheck size={14} color="var(--color-primary)" title="BMDC Verified Specialist" />
              )}
            </h3>
            <p className={styles.participantSubtitle}>{conversation.participantSubtitle}</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          {appointmentId && (
            <button
              type="button"
              className={styles.videoBtn}
              onClick={() => onOpenVideoCall(appointmentId)}
            >
              <Video size={14} aria-hidden="true" />
              <span>{isLive ? "Join Video Call" : "Video Room"}</span>
            </button>
          )}

          <button
            type="button"
            className={styles.detailsBtn}
            onClick={onToggleDrawer}
            title={isDrawerOpen ? "Hide clinical details" : "Show clinical details"}
          >
            <Info size={14} aria-hidden="true" />
            <span>{isDrawerOpen ? "Close Details" : "Clinical Context"}</span>
          </button>
        </div>
      </div>

      {/* Message Timeline */}
      <div ref={messageAreaRef} className={styles.messageArea}>
        <div className={styles.dateDivider}>
          <span className={styles.datePill}>Consultation Session · Today</span>
        </div>

        {messages.map((msg) => {
          if (msg.systemNotice) {
            return (
              <div key={msg.id} className={styles.systemNoticeCard}>
                <div className={styles.systemHeader}>
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span>{msg.senderName}</span>
                </div>
                <div className={styles.systemBody}>{msg.text}</div>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className={styles.attachmentList}>
                    {msg.attachments.map((att) => (
                      <div key={att.id} className={styles.attachmentCard}>
                        <FileText size={14} color="var(--color-primary)" aria-hidden="true" />
                        <span className={styles.attachmentName}>{att.name}</span>
                        {att.size && <span className={styles.attachmentSize}>({att.size})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const isSent = msg.senderId === currentUserId || msg.senderRole === currentUserRole;

          return (
            <div
              key={msg.id}
              className={`${styles.bubbleRow} ${isSent ? styles.bubbleRowSent : styles.bubbleRowReceived}`}
            >
              {!isSent && <span className={styles.senderLabel}>{msg.senderName}</span>}
              <div className={`${styles.bubble} ${isSent ? styles.bubbleSent : styles.bubbleReceived}`}>
                <div>{msg.text}</div>

                {msg.attachments && msg.attachments.length > 0 && (
                  <div className={styles.attachmentList}>
                    {msg.attachments.map((att) => (
                      <div key={att.id} className={styles.attachmentCard}>
                        <FileText size={14} aria-hidden="true" />
                        <span className={styles.attachmentName}>{att.name}</span>
                        {att.size && <span className={styles.attachmentSize}>({att.size})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.bubbleFooter}>
                <span>{msg.timestamp}</span>
                {isSent && (
                  <span title="Delivered">
                    <CheckCheck size={13} color="var(--color-primary)" aria-hidden="true" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sleek Composer Bar */}
      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <button
          type="button"
          className={styles.attachBtn}
          onClick={handleAttachSimulatedReport}
          title="Attach medical document"
        >
          <Paperclip size={18} aria-hidden="true" />
        </button>

        <input
          type="text"
          className={styles.inputField}
          placeholder="Type a clinical message or follow-up query…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />

        <button
          type="submit"
          className={styles.sendBtn}
          disabled={!inputText.trim()}
          title="Send message"
        >
          <Send size={14} aria-hidden="true" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
