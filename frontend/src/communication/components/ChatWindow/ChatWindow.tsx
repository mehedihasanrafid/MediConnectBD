import { useEffect, useRef, useState } from "react";
import {
  Check,
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
}

const PATIENT_QUICK_REPLIES = [
  "Can I take this medicine before meals?",
  "How many days should I continue this dose?",
  "Attaching my latest CBC blood report.",
  "Fever is 99°F this morning.",
];

const DOCTOR_QUICK_REPLIES = [
  "Take Paracetamol 500mg 1 tablet after meals, 3 times daily.",
  "Continue this dosage for 5 days.",
  "Please get a routine CBC blood test done.",
  "Stay well hydrated and take adequate rest.",
];

export function ChatWindow({
  conversation,
  messages,
  currentUserId,
  currentUserRole,
  onSendMessage,
  onOpenVideoCall,
  onToggleDrawer,
  isDrawerOpen,
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
        <p>Select a consultation conversation from the left to start messaging.</p>
      </div>
    );
  }

  const isLive = conversation.status === "LIVE_CONSULTATION";
  const appointmentId = conversation.linkedConsultation?.appointmentId;
  const quickReplies = currentUserRole === "DOCTOR" ? DOCTOR_QUICK_REPLIES : PATIENT_QUICK_REPLIES;

  function handleSend() {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  }

  function handleQuickReply(reply: string) {
    onSendMessage(reply);
  }

  function handleSimulateAttachReport() {
    onSendMessage("Sharing clinical file for review:", [
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
      {/* Chat Header */}
      <div className={styles.chatHeader}>
        <div className={styles.headerInfo}>
          <Avatar name={conversation.participantName} size="md" />
          <div className={styles.participantDetails}>
            <h3 className={styles.participantName}>
              <span>{conversation.participantName}</span>
              {conversation.participantRole === "DOCTOR" && (
                <ShieldCheck size={16} color="var(--color-primary)" title="BMDC Verified Specialist" />
              )}
            </h3>
            <p className={styles.participantSubtitle}>{conversation.participantSubtitle}</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          {appointmentId && (
            <button
              type="button"
              className={styles.callButton}
              onClick={() => onOpenVideoCall(appointmentId)}
            >
              <Video size={16} aria-hidden="true" />
              <span>{isLive ? "Join Video Call" : "Open Video Room"}</span>
            </button>
          )}

          <button
            type="button"
            className={styles.drawerToggleBtn}
            onClick={onToggleDrawer}
            title={isDrawerOpen ? "Hide details panel" : "Show details panel"}
          >
            <Info size={16} aria-hidden="true" />
            <span>{isDrawerOpen ? "Hide Details" : "Details"}</span>
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
                        <div className={styles.attachmentInfo}>
                          <FileText size={16} color="var(--color-primary)" aria-hidden="true" />
                          <span className={styles.attachmentName}>{att.name}</span>
                          {att.size && <span className={styles.attachmentSize}>({att.size})</span>}
                        </div>
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
                        <div className={styles.attachmentInfo}>
                          <FileText size={14} aria-hidden="true" />
                          <span className={styles.attachmentName}>{att.name}</span>
                          {att.size && <span className={styles.attachmentSize}>({att.size})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.bubbleFooter}>
                <span>{msg.timestamp}</span>
                {isSent && (
                  <span title="Delivered">
                    <CheckCheck size={14} color="var(--color-primary)" aria-hidden="true" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Replies Bar */}
      <div className={styles.quickRepliesBar}>
        <span className={styles.quickReplyLabel}>Quick:</span>
        {quickReplies.map((reply, i) => (
          <button
            key={i}
            type="button"
            className={styles.quickChip}
            onClick={() => handleQuickReply(reply)}
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Composer */}
      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <button
          type="button"
          className={styles.attachButton}
          onClick={handleSimulateAttachReport}
          title="Attach medical report or file"
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
          className={styles.sendButton}
          disabled={!inputText.trim()}
          title="Send message"
        >
          <Send size={16} aria-hidden="true" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
