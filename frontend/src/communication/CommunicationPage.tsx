import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { Button } from "../shared/ui";
import { useConversations } from "./hooks/useConversations";
import { useConversation } from "./hooks/useConversation";
import { ConversationList } from "./components/ConversationList/ConversationList";
import { ChatWindow } from "./components/ChatWindow/ChatWindow";
import { VideoModal } from "./components/VideoModal/VideoModal";
import { NewConversationDialog } from "./components/NewConversationDialog";
import { ConversationDetails } from "./components/ConversationDetails";
import { CommunicationHelp } from "./components/CommunicationHelp";
import type { Conversation } from "./types";
import styles from "./CommunicationPage.module.css";

function CommunicationWorkspace({ userId, roles, appointmentId }: { userId: string; roles: string[]; appointmentId: string | null }) {
  const clinical = roles.some((role) => role === "DOCTOR" || role === "PATIENT");
  const list = useConversations(userId, clinical);
  const [selection, setSelection] = useState<string | null | undefined>();
  const linked = appointmentId ? list.items.find((item) => item.linkedConsultation?.appointmentId === appointmentId) : null;
  const selectedId = selection === undefined ? linked?.id ?? null : selection;
  const [mobileSelection, setMobileChat] = useState<boolean | null>(null);
  const mobileChat = mobileSelection ?? Boolean(selectedId);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [group, setGroup] = useState<NonNullable<Conversation["kind"]>>(clinical ? "CONSULTATION" : "SUPPORT");
  const [panel, setPanel] = useState<"new" | "help" | "details" | null>(null);
  const thread = useConversation(list.blocked && !selectedId?.startsWith("direct:") ? null : selectedId, list.reload);
  const visible = list.items.filter((item) => (item.kind ?? "CONSULTATION") === group);
  const groups = [
    ...(clinical ? [{ kind: "CONSULTATION" as const, label: "Consultations" }] : []),
    ...(roles.includes("DOCTOR") ? [{ kind: "COLLEAGUE" as const, label: "Colleagues" }] : []),
    { kind: "SUPPORT" as const, label: "Support" },
    ...(roles.includes("ADMIN") ? [{ kind: "STAFF" as const, label: "Staff" }] : []),
  ];
  return <div className={styles.pageWrapper}>
    <div className={styles.topBar}><h1 className={styles.title}>Messages</h1><div className={styles.actions}>
      <Button size="sm" variant="ghost" onClick={() => setPanel("help")}>Help</Button>
      <Button size="sm" onClick={() => setPanel("new")}>New conversation</Button>
    </div></div>
    <div className={styles.groups} role="group" aria-label="Conversation groups">
      {groups.map((item) => <button type="button" key={item.kind} aria-pressed={group === item.kind} onClick={() => {
        setGroup(item.kind); setSelection(null); setMobileChat(false);
      }}>{item.label}</button>)}
      <button className={styles.refresh} type="button" onClick={list.reload} disabled={list.refreshing} aria-label="Refresh conversations">↻</button>
    </div>
    {appointmentId && !list.loading && !list.error && !linked && <p role="status" className={styles.muted}>No authorized conversation is available for this appointment.</p>}
    <div className={styles.mainHub}>
      <div className={`${styles.sidebarColumn} ${mobileChat ? styles.sidebarHiddenOnMobile : ""}`}>
        {list.loading ? <p role="status">Loading conversations…</p> : (group === "CONSULTATION" ? list.error : list.directError) ?
          <p role="alert">{group === "CONSULTATION" ? list.error : list.directError}</p> :
          <ConversationList conversations={visible} activeConversationId={selectedId} onSelectConversation={(id) => { setSelection(id); setMobileChat(true); }} />}
      </div>
      <div className={`${styles.chatColumn} ${!mobileChat ? styles.chatHiddenOnMobile : ""}`}>
        <ChatWindow key={selectedId} conversation={thread.conversation} messages={thread.messages} currentUserId={userId}
          loading={thread.loading} sending={thread.sending} error={list.blocked && !selectedId?.startsWith("direct:") ? list.error : thread.error}
          sendError={thread.sendError} onSendMessage={thread.send} onOpenVideoCall={setVideoId}
          onBackToList={() => { setSelection(null); setMobileChat(false); }} onOpenDetails={() => setPanel("details")}
          olderError={thread.olderError} onReload={thread.reload} onLoadOlder={thread.loadOlder} hasOlder={thread.hasOlder} olderBusy={thread.olderBusy} />
      </div>
    </div>
    {videoId && <VideoModal appointmentId={videoId} onClose={() => setVideoId(null)} />}
    {panel === "help" && <CommunicationHelp onClose={() => setPanel(null)} />}
    {panel === "details" && thread.conversation && <ConversationDetails conversation={thread.conversation} onClose={() => setPanel(null)} />}
    {panel === "new" && <NewConversationDialog roles={roles} initialKind={roles.includes("ADMIN") ? "STAFF" : group === "COLLEAGUE" ? "COLLEAGUE" : "SUPPORT"}
      onClose={() => setPanel(null)} onCreated={(conversation) => {
        list.reload(); setGroup(conversation.kind ?? "SUPPORT"); setSelection(conversation.id); setMobileChat(true);
      }} />}
  </div>;
}
export function CommunicationPage() {
  const { user } = useAuth(), [params] = useSearchParams();
  if (!user || !user.roles.some((role) => ["DOCTOR", "PATIENT", "ADMIN"].includes(role))) return <p role="alert">Sign in to access communication.</p>;
  return <CommunicationWorkspace key={`${user.id}:${params.get("appointmentId") ?? ""}`} userId={user.id}
    roles={user.roles} appointmentId={params.get("appointmentId")} />;
}
