import { useState } from "react";
import { Send } from "lucide-react";
import styles from "../ChatWindow/ChatWindow.module.css";

export function MessageComposer({ disabled, sending, onSend }: {
  disabled: boolean;
  sending: boolean;
  onSend: (text: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState("");
  return (
    <form className={styles.composer} onSubmit={async (event) => {
      event.preventDefault();
      if (disabled || sending || !draft.trim()) return;
      if (await onSend(draft.trim())) setDraft("");
    }}>
      <textarea className={styles.inputField} aria-label="Message" rows={2}
        placeholder="Write a message…" value={draft} maxLength={2000}
        disabled={disabled || sending} onChange={(event) => setDraft(event.target.value)} />
      <button type="submit" className={styles.sendBtn}
        disabled={disabled || sending || !draft.trim()}>
        <Send size={14} aria-hidden="true" />{sending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
