import { useState } from "react";
import { Search } from "lucide-react";
import { Avatar } from "../../../shared/ui";
import type { Conversation, ConversationFilter } from "../../types";
import styles from "./ConversationList.module.css";

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("ALL");

  const filtered = conversations.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.participantName.toLowerCase().includes(q);
      const matchSub = c.participantSubtitle.toLowerCase().includes(q);
      const matchMsg = c.lastMessage.toLowerCase().includes(q);
      if (!matchName && !matchSub && !matchMsg) return false;
    }

    if (filter === "ACTIVE") {
      return c.status === "LIVE_CONSULTATION" || c.status === "ACTIVE_FOLLOWUP";
    }
    if (filter === "SUPPORT") {
      return c.status === "SUPPORT";
    }
    return true;
  });

  return (
    <div className={styles.container}>
      <div className={styles.searchHeader}>
        <div className={styles.searchBar}>
          <Search size={15} color="var(--color-text-subtle)" aria-hidden="true" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterTabs}>
          <button
            type="button"
            className={`${styles.filterTab} ${filter === "ALL" ? styles.filterTabActive : ""}`}
            onClick={() => setFilter("ALL")}
          >
            All
          </button>
          <button
            type="button"
            className={`${styles.filterTab} ${filter === "ACTIVE" ? styles.filterTabActive : ""}`}
            onClick={() => setFilter("ACTIVE")}
          >
            Active
          </button>
          <button
            type="button"
            className={`${styles.filterTab} ${filter === "SUPPORT" ? styles.filterTabActive : ""}`}
            onClick={() => setFilter("SUPPORT")}
          >
            Help Desk
          </button>
        </div>
      </div>

      <ul className={styles.listBody} role="listbox" aria-label="Consultation conversations">
        {filtered.length === 0 ? (
          <li className={styles.emptyList}>No conversations found.</li>
        ) : (
          filtered.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isLive = conv.status === "LIVE_CONSULTATION";

            return (
              <li
                key={conv.id}
                role="option"
                aria-selected={isActive}
                tabIndex={0}
                className={`${styles.conversationItem} ${isActive ? styles.conversationItemActive : ""}`}
                onClick={() => onSelectConversation(conv.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectConversation(conv.id);
                  }
                }}
              >
                <div className={styles.avatarWrapper}>
                  <Avatar name={conv.participantName} size="md" />
                  {isLive && <span className={styles.liveIndicator} title="Live session active" />}
                </div>

                <div className={styles.itemContent}>
                  <div className={styles.topRow}>
                    <span className={styles.name}>{conv.participantName}</span>
                    <span className={styles.time}>{conv.lastMessageAt}</span>
                  </div>

                  <div className={styles.bottomRow}>
                    <span className={styles.previewText}>{conv.lastMessage}</span>
                    <div className={styles.pillRow}>
                      {isLive && <span className={styles.liveTag}>LIVE CALL</span>}
                      {conv.unreadCount > 0 && (
                        <span className={styles.unreadDot}>{conv.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
