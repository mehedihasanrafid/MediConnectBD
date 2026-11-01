import { useEffect, useState } from "react";
import { Clock, ShieldCheck, Video, Wifi } from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import { isDoctor } from "../shared/utils/roles";
import { Page } from "../shared/ui";
import { playChimeSound } from "../shared/utils/sound";
import { DoctorBreadcrumbs } from "../doctor/dashboard/components/DoctorBreadcrumbs/DoctorBreadcrumbs";
import { PatientBreadcrumbs } from "../patient/components/PatientBreadcrumbs/PatientBreadcrumbs";
import type { ChatMessage, Conversation } from "./types";
import {
  DOCTOR_DEMO_CONVERSATIONS,
  INITIAL_MESSAGES,
  PATIENT_DEMO_CONVERSATIONS,
} from "./data/demoConversations";
import { ConversationList } from "./components/ConversationList/ConversationList";
import { ChatWindow } from "./components/ChatWindow/ChatWindow";
import { ContextDrawer } from "./components/ContextDrawer/ContextDrawer";
import { VideoModal } from "./components/VideoModal/VideoModal";
import styles from "./CommunicationPage.module.css";

export function CommunicationPage({
  initialDrawerOpen = false,
}: {
  initialDrawerOpen?: boolean;
} = {}) {
  const { user } = useAuth();
  const userIsDoctor = isDoctor(user);
  const currentUserRole: "DOCTOR" | "PATIENT" = userIsDoctor ? "DOCTOR" : "PATIENT";
  const currentUserId = user?.id || (userIsDoctor ? "doctor-demo-user" : "patient-demo-user");

  const initialList = userIsDoctor ? DOCTOR_DEMO_CONVERSATIONS : PATIENT_DEMO_CONVERSATIONS;
  const [conversations, setConversations] = useState<Conversation[]>(initialList);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES);
  const [activeConvId, setActiveConvId] = useState<string>(initialList[0]?.id ?? "");
  const [isDrawerOpen, setIsDrawerOpen] = useState(initialDrawerOpen);
  const [mobileView, setMobileView] = useState<"LIST" | "CHAT">("LIST");
  const [videoAppointmentId, setVideoAppointmentId] = useState<string | null>(null);
  const [dhakaTime, setDhakaTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDhakaTime(
        now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Dhaka",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeConvId) ?? null;
  const currentMessages = activeConvId ? messagesMap[activeConvId] ?? [] : [];

  // Live call consultation banner
  const liveConv = conversations.find((c) => c.status === "LIVE_CONSULTATION");

  function handleSelectConversation(id: string) {
    setActiveConvId(id);
    setMobileView("CHAT");
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
    );
  }

  function handleSendMessage(text: string, attachments?: ChatMessage["attachments"]) {
    if (!activeConvId) return;

    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId: activeConvId,
      senderId: currentUserId,
      senderName: user ? `${user.firstName} ${user.lastName}` : (userIsDoctor ? "Dr. Demo Doctor" : "Demo Patient"),
      senderRole: currentUserRole,
      text,
      timestamp: timeString,
      attachments,
    };

    setMessagesMap((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), newMsg],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? {
              ...c,
              lastMessage: text,
              lastMessageAt: "Just now",
            }
          : c,
      ),
    );

    // Realistic auto-reply simulation for demo if recipient is the other party
    if (activeConvId.includes("doc-demo") || activeConvId.includes("patient-demo")) {
      setTimeout(() => {
        const replyText = userIsDoctor
          ? "Thank you doctor. I have taken note of the instructions and will take the medicines on time."
          : "Noted. I have recorded your symptom update in your consultation file. Let me know if fever exceeds 102°F.";

        const autoMsg: ChatMessage = {
          id: `msg-auto-${Date.now()}`,
          conversationId: activeConvId,
          senderId: "simulated-counterparty",
          senderName: userIsDoctor ? "Demo Patient" : "Dr. Demo Doctor",
          senderRole: userIsDoctor ? "PATIENT" : "DOCTOR",
          text: replyText,
          timestamp: timeString,
        };

        setMessagesMap((prev) => ({
          ...prev,
          [activeConvId]: [...(prev[activeConvId] || []), autoMsg],
        }));

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId
              ? {
                  ...c,
                  lastMessage: replyText,
                  lastMessageAt: "Just now",
                }
              : c,
          ),
        );
      }, 1500);
    }
  }

  function handleOpenVideoCall(appointmentId: string) {
    playChimeSound("call");
    setVideoAppointmentId(appointmentId);
  }

  return (
    <Page>
      <div className={styles.pageWrapper}>
        {/* Role-based Desktop Navigation Breadcrumbs */}
        {userIsDoctor ? (
          <DoctorBreadcrumbs activeTabLabel="Consultation Communication Hub" />
        ) : (
          <PatientBreadcrumbs activePageLabel="Consultation Communication Hub" />
        )}

        {/* Sleek Top Navigation & Live Consultation Status Bar */}
        <div className={styles.topBar}>
          <div className={styles.topTitleGroup}>
            <h2 className={styles.title}>Consultation Communication Hub</h2>
            <span className={styles.eyebrowBadge}>Connected Care &amp; Telemedicine</span>
          </div>

          {liveConv?.linkedConsultation && (
            <div className={styles.liveCallAlert}>
              <span className={styles.liveDot} aria-hidden="true" />
              <span className={styles.liveCallText}>
                {currentUserRole === "PATIENT"
                  ? `Live Video Call Ready with ${liveConv.participantName}`
                  : `Consultation Slot Active for ${liveConv.participantName}`}
              </span>
              <button
                type="button"
                className={styles.joinBannerBtn}
                onClick={() => handleOpenVideoCall(liveConv.linkedConsultation!.appointmentId)}
              >
                <Video size={13} aria-hidden="true" />
                <span>Join Video Room</span>
              </button>
            </div>
          )}
        </div>

        {/* Responsive 2-Column Hub (Full height on mobile with slide back/forward) */}
        <div className={styles.mainHub}>
          <div
            className={`${styles.sidebarColumn} ${
              mobileView === "CHAT" ? styles.sidebarHiddenOnMobile : ""
            }`}
          >
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConvId}
              onSelectConversation={handleSelectConversation}
            />
          </div>

          <div
            className={`${styles.chatColumn} ${
              mobileView === "LIST" ? styles.chatHiddenOnMobile : ""
            }`}
          >
            <ChatWindow
              conversation={activeConversation}
              messages={currentMessages}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onSendMessage={handleSendMessage}
              onOpenVideoCall={handleOpenVideoCall}
              onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
              isDrawerOpen={isDrawerOpen}
              onBackToList={() => setMobileView("LIST")}
            />

            {isDrawerOpen && (
              <ContextDrawer
                consultation={activeConversation?.linkedConsultation}
                onClose={() => setIsDrawerOpen(false)}
                onOpenVideoCall={handleOpenVideoCall}
              />
            )}
          </div>
        </div>

        {/* Docked Desktop Communication Status Bar */}
        <footer className={styles.statusBar} aria-label="Telehealth Communication Status">
          <div className={styles.statusLeft}>
            <span className={styles.statusPill}>
              <span className={styles.statusSuccessDot} aria-hidden="true" />
              <span>Telehealth Gateway: Connected (18ms)</span>
            </span>
            <span className={styles.statusPill}>
              <span>{conversations.length} Active Conversations</span>
            </span>
            <span className={styles.statusPill}>
              <ShieldCheck size={12} style={{ color: "var(--color-success)" }} aria-hidden="true" />
              <span>AES-256 Encrypted Clinical Messaging</span>
            </span>
          </div>

          <div className={styles.statusRight}>
            <span className={styles.statusPill}>
              <Wifi size={12} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
              <span>Daily.co WebRTC Ready</span>
            </span>
            {dhakaTime && (
              <span className={styles.statusPill}>
                <Clock size={12} aria-hidden="true" />
                <span>Asia/Dhaka {dhakaTime} (BST)</span>
              </span>
            )}
          </div>
        </footer>
      </div>

      {videoAppointmentId && (
        <VideoModal
          appointmentId={videoAppointmentId}
          onClose={() => setVideoAppointmentId(null)}
        />
      )}
    </Page>
  );
}
