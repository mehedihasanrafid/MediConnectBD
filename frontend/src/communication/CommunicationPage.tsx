import { useState } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { isDoctor } from "../shared/utils/roles";
import { Page, PageHeader } from "../shared/ui";
import type { ChatMessage, Conversation } from "./types";
import {
  DOCTOR_DEMO_CONVERSATIONS,
  INITIAL_MESSAGES,
  PATIENT_DEMO_CONVERSATIONS,
} from "./data/demoConversations";
import { ConversationList } from "./components/ConversationList/ConversationList";
import { ChatWindow } from "./components/ChatWindow/ChatWindow";
import { ContextDrawer } from "./components/ContextDrawer/ContextDrawer";
import { QuickCallBanner } from "./components/QuickCallBanner/QuickCallBanner";
import { VideoModal } from "./components/VideoModal/VideoModal";
import styles from "./CommunicationPage.module.css";

export function CommunicationPage() {
  const { user } = useAuth();
  const userIsDoctor = isDoctor(user);
  const currentUserRole: "DOCTOR" | "PATIENT" = userIsDoctor ? "DOCTOR" : "PATIENT";
  const currentUserId = user?.id || (userIsDoctor ? "doctor-demo-user" : "patient-demo-user");

  const initialList = userIsDoctor ? DOCTOR_DEMO_CONVERSATIONS : PATIENT_DEMO_CONVERSATIONS;
  const [conversations, setConversations] = useState<Conversation[]>(initialList);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES);
  const [activeConvId, setActiveConvId] = useState<string>(initialList[0]?.id ?? "");
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [videoAppointmentId, setVideoAppointmentId] = useState<string | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeConvId) ?? null;
  const currentMessages = activeConvId ? messagesMap[activeConvId] ?? [] : [];

  // Live call consultation banner
  const liveConv = conversations.find((c) => c.status === "LIVE_CONSULTATION");

  function handleSelectConversation(id: string) {
    setActiveConvId(id);
    // Mark as read
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
    setVideoAppointmentId(appointmentId);
  }

  return (
    <Page>
      <div className={styles.pageContainer}>
        <PageHeader
          eyebrow="Connected Care & Telemedicine"
          title="Consultation Communication Hub"
          description="Direct clinical messaging with verified BMDC doctors, real-time telehealth video rooms, and follow-up care."
        />

        {liveConv?.linkedConsultation && (
          <QuickCallBanner
            doctorOrPatientName={liveConv.participantName}
            role={currentUserRole}
            appointmentId={liveConv.linkedConsultation.appointmentId}
            onJoinCall={handleOpenVideoCall}
          />
        )}

        <div className={styles.hubCard}>
          <div className={styles.leftColumn}>
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConvId}
              onSelectConversation={handleSelectConversation}
            />
          </div>

          <div className={styles.centerColumn}>
            <ChatWindow
              conversation={activeConversation}
              messages={currentMessages}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onSendMessage={handleSendMessage}
              onOpenVideoCall={handleOpenVideoCall}
              onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
              isDrawerOpen={isDrawerOpen}
            />
          </div>

          {isDrawerOpen && (
            <ContextDrawer
              consultation={activeConversation?.linkedConsultation}
              onClose={() => setIsDrawerOpen(false)}
              onOpenVideoCall={handleOpenVideoCall}
            />
          )}
        </div>
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
