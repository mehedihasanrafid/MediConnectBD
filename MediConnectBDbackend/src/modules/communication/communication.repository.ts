/**
 * Repository interface for Communication persistence.
 */

import type {
  ActorContext,
  ConversationDetailView,
  ConversationSummaryView,
  CreateMessageInput,
  PaginatedMessagesView,
  MessageView,
} from "./communication.types";

export interface CommunicationRepository {
  /**
   * Discovers confirmed/completed appointments for the actor that do not yet have
   * a conversation record, and provisions them with default 7-day entitlements.
   */
  syncEligibleConversations(actor: ActorContext, now: Date): Promise<void>;

  /**
   * Lists all conversations for the authenticated actor with unread count and latest message.
   */
  listConversations(actor: ActorContext, now: Date): Promise<ConversationSummaryView[]>;

  /**
   * Retrieves single conversation details, verifying participant ownership.
   */
  getConversationById(
    conversationId: string,
    actor: ActorContext,
    now: Date,
  ): Promise<ConversationDetailView | null>;

  /**
   * Retrieves paginated message history for a conversation using a cursor.
   */
  listMessages(
    conversationId: string,
    actor: ActorContext,
    query: { limit: number; before?: string | undefined },
  ): Promise<PaginatedMessagesView>;

  /**
   * Persists a message with idempotency deduplication and entitlement verification.
   */
  createMessage(
    conversationId: string,
    actor: ActorContext,
    input: CreateMessageInput,
    now: Date,
  ): Promise<{ message: MessageView; isReplay: boolean }>;
}
