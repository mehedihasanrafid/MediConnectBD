/**
 * Communication service — coordinates business logic, entitlement enforcement,
 * and clock-injected follow-up access rules.
 */

import { AppError } from "../../utils/app-error";
import type { CommunicationRepository } from "./communication.repository";
import type {
  ActorContext,
  ConversationDetailView,
  ConversationSummaryView,
  CreateMessageInput,
  MessageView,
  PaginatedMessagesView,
} from "./communication.types";

export class CommunicationService {
  constructor(
    private readonly repository: CommunicationRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listConversations(actor: ActorContext): Promise<ConversationSummaryView[]> {
    return this.repository.listConversations(actor, this.now());
  }

  async getConversation(
    conversationId: string,
    actor: ActorContext,
  ): Promise<ConversationDetailView> {
    const conversation = await this.repository.getConversationById(
      conversationId,
      actor,
      this.now(),
    );
    if (!conversation) {
      throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation was not found");
    }
    return conversation;
  }

  async listMessages(
    conversationId: string,
    actor: ActorContext,
    query: { limit: number; before?: string | undefined },
  ): Promise<PaginatedMessagesView> {
    return this.repository.listMessages(conversationId, actor, query);
  }

  async sendMessage(
    conversationId: string,
    actor: ActorContext,
    input: CreateMessageInput,
  ): Promise<{ message: MessageView; isReplay: boolean }> {
    return this.repository.createMessage(conversationId, actor, input, this.now());
  }
}
