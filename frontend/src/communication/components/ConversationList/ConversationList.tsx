import { useState } from "react";
import { Search } from "lucide-react";
import { Avatar } from "../../../shared/ui";
import type { Conversation } from "../../types";
import styles from "./ConversationList.module.css";

function appointmentLabel(conversation: Conversation) {
  if (!conversation.scheduledStartAt) return "";
  return new Date(conversation.scheduledStartAt).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}
export function ConversationList({ conversations, activeConversationId, onSelectConversation }: {
  conversations: Conversation[]; activeConversationId: string | null; onSelectConversation: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = conversations.filter((item) =>
    `${item.participantName} ${item.participantSubtitle} ${item.beneficiary?.name ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <nav className={styles.container} aria-label="Consultation conversations">
    <div className={styles.searchHeader}><div className={styles.searchBar}>
      <Search size={15} aria-hidden="true" /><input className={styles.searchInput} aria-label="Search conversations"
        placeholder="Search conversations…" value={search} onChange={(event) => setSearch(event.target.value)} />
    </div></div>
    <ul className={styles.listBody}>
      {!filtered.length && <li className={styles.emptyList}>{conversations.length ? "No matching conversations." : "No conversations yet."}</li>}
      {filtered.map((conversation) => <li key={conversation.id}>
        <button type="button" data-conversation-id={conversation.id} aria-current={conversation.id === activeConversationId ? "true" : undefined}
          className={`${styles.conversationItem} ${conversation.id === activeConversationId ? styles.conversationItemActive : ""}`}
          onClick={() => onSelectConversation(conversation.id)}>
          <Avatar name={conversation.participantName} src={conversation.participantAvatarUrl} size="sm" />
          <span className={styles.itemContent}>
            <span className={styles.name}>{conversation.participantName}</span>
            <span className={styles.previewText} title={conversation.participantSubtitle}>{conversation.participantSubtitle}</span>
            {appointmentLabel(conversation) && <span className={styles.previewText}>{appointmentLabel(conversation)} · {conversation.appointmentMode === "CHAMBER" ? "Chamber" : "Video"}</span>}
            <span className={styles.previewText}>{conversation.lastMessage || "No messages yet"}</span>
            {conversation.communicationState === "EXPIRED" && <span className={styles.expired}>Expired</span>}
          </span>
          {Number(conversation.unreadCount) > 0 && <span className={styles.unread} aria-label={`${conversation.unreadCount} unread messages`}>{conversation.unreadCount}</span>}
        </button>
      </li>)}
    </ul>
  </nav>;
}
