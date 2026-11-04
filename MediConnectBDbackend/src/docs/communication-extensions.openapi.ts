import type { OpenAPIV3 } from "openapi-types";
type Schema = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
const ref = (name: string): OpenAPIV3.ReferenceObject => ({ $ref: "#/components/schemas/" + name });
const text: Schema = { type: "string" }, uuid: Schema = { type: "string", format: "uuid" };
const timestamp: Schema = { type: "string", format: "date-time" };
const object = (properties: Record<string, Schema>, required = Object.keys(properties)): Schema => ({ type: "object", properties, required });
const items = (name: string): Schema => object({ items: { type: "array", items: ref(name) } });
const kind: Schema = { type: "string", enum: ["SUPPORT", "COLLEAGUE", "STAFF"] };
const id: OpenAPIV3.ParameterObject = { name: "id", in: "path", required: true, schema: uuid };
const query = (name: string, schema: Schema): OpenAPIV3.ParameterObject => ({ name, in: "query", schema, required: false });
export const communicationExtensionSchemas: Record<string, Schema> = {
  DirectContact: object({ userId: uuid, name: text, role: { type: "string", enum: ["DOCTOR", "PATIENT", "ADMIN"] },
    avatarUrl: { type: "string", nullable: true, format: "uri-reference" }, subtitle: text }),
  DirectContacts: items("DirectContact"),
  StartDirectConversation: object({ kind, recipientId: uuid }, ["kind"]),
  DirectMessage: object({ id: uuid, conversationId: text, senderId: uuid, senderRole: { type: "string", enum: ["DOCTOR", "PATIENT", "ADMIN"] },
    senderName: text, content: text, createdAt: timestamp }),
  DirectMessagePage: object({ items: { type: "array", items: ref("DirectMessage") }, nextCursor: { type: "string", nullable: true }, hasMore: { type: "boolean" } }),
  DirectConversation: object({ id: text, kind, appointmentId: { type: "string", nullable: true }, participant: ref("DirectContact"),
    lastMessage: { ...ref("DirectMessage"), nullable: true } as Schema, unreadCount: { type: "integer", minimum: 0 },
    canSend: { type: "boolean" }, videoAvailable: { type: "boolean" }, communicationState: { type: "string", enum: ["AVAILABLE", "UNAVAILABLE"] },
    unavailableReason: text, createdAt: timestamp, updatedAt: timestamp }),
  DirectConversations: items("DirectConversation"),
  CommunicationCapabilities: object({ directMessaging: { type: "boolean" }, callsAvailable: { type: "boolean" } }),
  StartCommunicationCall: object({ conversationId: text, media: { type: "string", enum: ["AUDIO", "VIDEO"] }, idempotencyKey: uuid }),
  CommunicationCallAction: object({ action: { type: "string", enum: ["accept", "decline", "cancel", "end"] } }),
  CommunicationCall: object({ id: uuid, conversationId: text, caller: object({ userId: uuid, name: text }), callee: object({ userId: uuid, name: text }),
    media: { type: "string", enum: ["AUDIO", "VIDEO"] }, status: { type: "string", enum: ["RINGING", "ACCEPTED", "DECLINED", "CANCELLED", "MISSED", "ENDED"] },
    createdAt: timestamp, answeredAt: { type: "string", format: "date-time", nullable: true },
    endedAt: { type: "string", format: "date-time", nullable: true }, expiresAt: timestamp }),
  CommunicationCalls: items("CommunicationCall"),
  CommunicationCallRoom: object({ roomName: text, roomUrl: { type: "string", format: "uri" }, accessToken: text,
    provider: { type: "string", enum: ["daily"] }, expiresAt: timestamp, media: { type: "string", enum: ["AUDIO", "VIDEO"] } }),
};
export const communicationExtensionPaths: OpenAPIV3.PathsObject = {};
function add(method: "get" | "post", path: string, summary: string, response: string, body?: string, parameters: OpenAPIV3.ParameterObject[] = []) {
  const responses: OpenAPIV3.ResponsesObject = { [method === "post" && !path.endsWith("actions") ? "201" : "200"]: {
    description: "Successful response", content: { "application/json": { schema: ref(response) } },
  } };
  for (const code of [401, 403, 404, 409, 422, 429, 500, 503]) responses[code] = { $ref: "#/components/responses/Error" + code };
  const operation: OpenAPIV3.OperationObject = { summary, operationId: "extendedCommunication_" + method + path.replace(/[^A-Za-z0-9]/g, "_"),
    tags: [path.includes("/calls") ? "Calls" : "Direct messaging"], security: [{ bearerAuth: [] }], parameters, responses,
    description: "Membership is enforced on the server. Admins may use their assigned support/staff chats; admin status does not grant consultation access." };
  if (body) operation.requestBody = { required: true, content: { "application/json": { schema: ref(body) } } };
  const full = "/api/v1/communication" + path;
  communicationExtensionPaths[full] ??= {};
  communicationExtensionPaths[full]![method] = operation;
}
add("get", "/direct/contacts", "Find permitted contacts", "DirectContacts", undefined,
  [{ name: "kind", in: "query", required: true, schema: kind }, query("search", { type: "string", maxLength: 80 })]);
add("get", "/direct/conversations", "Read your support, colleague and staff inbox", "DirectConversations");
add("post", "/direct/conversations", "Start or retrieve a direct conversation", "DirectConversation", "StartDirectConversation");
add("get", "/direct/conversations/{id}", "Read an authorized direct conversation", "DirectConversation", undefined, [id]);
add("get", "/direct/conversations/{id}/messages", "Read direct messages and mark them read", "DirectMessagePage", undefined,
  [id, query("limit", { type: "integer", minimum: 1, maximum: 100, default: 30 }), query("before", uuid)]);
add("post", "/direct/conversations/{id}/messages", "Send an idempotent direct message", "DirectMessage", "CreateMessage", [id]);
add("get", "/capabilities", "Read communication service availability", "CommunicationCapabilities");
add("get", "/calls/active", "Read your currently ringing or accepted call", "CommunicationCalls");
add("get", "/calls", "Read your most recent call history", "CommunicationCalls", undefined, [query("conversationId", text)]);
add("post", "/calls", "Ring an eligible conversation member", "CommunicationCall", "StartCommunicationCall");
add("get", "/calls/{id}", "Read an authorized call's status", "CommunicationCall", undefined, [id]);
add("post", "/calls/{id}/actions", "Accept, decline, cancel or end a call", "CommunicationCall", "CommunicationCallAction", [id]);
add("get", "/calls/{id}/room", "Issue participant credentials after acceptance", "CommunicationCallRoom", undefined, [id]);
