import { useEffect, useState } from "react";
import { Alert, Avatar, Button, Dialog, DialogContent, Field, FormField, Select } from "../../shared/ui";
import { getErrorMessage } from "../../shared/utils/apiError";
import { communicationApi } from "../api/communicationApi";
import type { Conversation } from "../types";
import styles from "../CommunicationPage.module.css";

export function NewConversationDialog({ roles, initialKind, onCreated, onClose }: {
  roles: string[]; initialKind: "SUPPORT" | "COLLEAGUE" | "STAFF"; onCreated: (conversation: Conversation) => void; onClose: () => void;
}) {
  const [kind, setKind] = useState(initialKind), [search, setSearch] = useState(""), [recipientId, setRecipient] = useState("");
  const [contacts, setContacts] = useState<{ userId: string; name: string; role: string; avatarUrl?: string | null }[]>([]);
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    if (kind === "SUPPORT") return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true); setError("");
      communicationApi.contacts(kind, search, controller.signal).then((result) => {
        if (!controller.signal.aborted) setContacts(result.items);
      }).catch((caught) => { if (!controller.signal.aborted) setError(getErrorMessage(caught, "Could not load contacts.")); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [kind, search]);
  async function create() {
    if (busy) return;
    setBusy(true); setError("");
    try { onCreated(await communicationApi.create(kind, kind === "SUPPORT" ? undefined : recipientId)); onClose(); }
    catch (caught) { setError(getErrorMessage(caught, "Could not start the conversation.")); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent title="New conversation" description="Choose who you want to contact."
      footer={<div className={styles.actions}><Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button loading={busy} disabled={kind !== "SUPPORT" && !recipientId} onClick={() => void create()}>Start conversation</Button></div>}>
      <div className={styles.stack}>
        {error && <Alert kind="error">{error}</Alert>}
        <FormField label="Conversation type"><Select value={kind} disabled={busy}
          onChange={(event) => { setKind(event.target.value as typeof kind); setRecipient(""); setContacts([]); }}>
          {roles.includes("DOCTOR") && <option value="COLLEAGUE">Colleague</option>}
          {!roles.includes("ADMIN") && <option value="SUPPORT">Support</option>}
          {roles.includes("ADMIN") && <option value="STAFF">Staff</option>}
        </Select></FormField>
        {kind === "SUPPORT" ? <p className={styles.muted}>Connect with a support agent about your account, bookings or payments.</p> : <>
          <Field label={kind === "COLLEAGUE" ? "Find a doctor" : "Find staff"} value={search} onChange={setSearch} disabled={busy} />
          {loading && <p role="status">Loading contacts…</p>}
          <div className={styles.contacts} role="group" aria-label="Available contacts">
            {!loading && !contacts.length && !error && <p className={styles.muted}>No eligible contacts found.</p>}
            {contacts.map((contact) => <button type="button" key={contact.userId} className={styles.contact}
              aria-pressed={recipientId === contact.userId} disabled={busy} onClick={() => setRecipient(contact.userId)}>
              <Avatar name={contact.name} src={contact.avatarUrl} size="sm" /><span>{contact.name}</span>
              {recipientId === contact.userId && <span aria-hidden="true">✓</span>}
            </button>)}
          </div>
        </>}
      </div>
    </DialogContent>
  </Dialog>;
}
