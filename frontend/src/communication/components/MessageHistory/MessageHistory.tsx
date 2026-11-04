import { useEffect, useRef } from "react";
import type { ChatMessage } from "../../types";
import styles from "../ChatWindow/ChatWindow.module.css";

const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium" });
const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" });
export function MessageHistory({ messages, currentUserId }: { messages: ChatMessage[]; currentUserId: string }) {
  const area = useRef<HTMLDivElement>(null);
  const latestId = messages.at(-1)?.id;
  useEffect(() => { area.current?.scrollTo?.({ top: area.current.scrollHeight }); }, [latestId]);
  return <div ref={area} className={styles.messageArea} role="log" aria-label="Message history">
    {!messages.length && <p>No messages yet in this conversation.</p>}
    {messages.map((message, index) => {
      const sent = message.senderId === currentUserId, date = new Date(message.timestamp);
      const label = Number.isNaN(date.getTime()) ? "" : day.format(date);
      const previous = index ? new Date(messages[index - 1].timestamp) : null;
      const newDay = !previous || Number.isNaN(previous.getTime()) || label !== day.format(previous);
      return <div className={styles.messageGroup} key={message.id}>
        {newDay && <div className={styles.dateSeparator}>{label}</div>}
        <div className={`${styles.bubbleRow} ${sent ? styles.bubbleRowSent : styles.bubbleRowReceived}`}>
          <span className={styles.visuallyHidden}>{sent ? "You" : message.senderName}</span>
          <div className={`${styles.bubble} ${sent ? styles.bubbleSent : styles.bubbleReceived}`}>{message.text}</div>
          <time className={styles.bubbleFooter} dateTime={message.timestamp}>{Number.isNaN(date.getTime()) ? "" : clock.format(date)}</time>
        </div>
      </div>;
    })}
  </div>;
}
