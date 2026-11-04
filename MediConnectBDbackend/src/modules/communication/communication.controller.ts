/**
 * Communication HTTP controller — validates request schema, extracts authenticated actor,
 * and delegates to CommunicationService.
 */

import type { RequestHandler as HttpHandler } from "express";
import type { AuthenticatedLocals } from "../auth/auth.middleware";
import type { CommunicationService } from "./communication.service";
import type { ActorContext } from "./communication.types";
import {
  conversationIdParamSchema,
  createMessageSchema,
  listMessagesQuerySchema,
} from "./communication.schema";

function extractActor(locals: AuthenticatedLocals): ActorContext {
  const user = locals.authUser;
  const isDoctor = user.roles.includes("DOCTOR");
  return {
    userId: user.id,
    userRole: isDoctor ? "DOCTOR" : "PATIENT",
    doctorProfileId: user.doctorProfile?.id ?? null,
    patientProfileId: user.patientProfileId ?? null,
    userName: `${user.firstName} ${user.lastName}`.trim(),
  };
}

export function createCommunicationController(options: {
  communicationService: CommunicationService;
}) {
  return {
    listConversations: async (
      _request: Parameters<HttpHandler>[0],
      response: Parameters<HttpHandler>[1],
    ) => {
      const actor = extractActor(response.locals as AuthenticatedLocals);
      const items = await options.communicationService.listConversations(actor);
      response.status(200).json({ items });
    },

    getConversation: async (
      request: Parameters<HttpHandler>[0],
      response: Parameters<HttpHandler>[1],
    ) => {
      const actor = extractActor(response.locals as AuthenticatedLocals);
      const conversationId = conversationIdParamSchema.parse(request.params.id);
      const data = await options.communicationService.getConversation(conversationId, actor);
      response.status(200).json(data);
    },

    listMessages: async (
      request: Parameters<HttpHandler>[0],
      response: Parameters<HttpHandler>[1],
    ) => {
      const actor = extractActor(response.locals as AuthenticatedLocals);
      const conversationId = conversationIdParamSchema.parse(request.params.id);
      const query = listMessagesQuerySchema.parse(request.query);
      const data = await options.communicationService.listMessages(conversationId, actor, query);
      response.status(200).json(data);
    },

    sendMessage: async (
      request: Parameters<HttpHandler>[0],
      response: Parameters<HttpHandler>[1],
    ) => {
      const actor = extractActor(response.locals as AuthenticatedLocals);
      const conversationId = conversationIdParamSchema.parse(request.params.id);
      const input = createMessageSchema.parse(request.body);
      const { message, isReplay } = await options.communicationService.sendMessage(
        conversationId,
        actor,
        input,
      );
      response.status(isReplay ? 200 : 201).json(message);
    },
  };
}
