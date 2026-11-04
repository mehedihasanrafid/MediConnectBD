# Communication API contract — November 4, 2026

Base `/api/v1/communication`. All endpoints require the existing Bearer authentication. The frontend's shared transport handles cookies and token refresh. The backend authorizes membership on every protected operation.

## Clinical conversations (preserved)

| Method | Path | Response |
| --- | --- | --- |
| GET | `/conversations` | `{ items: ConversationSummary[] }` |
| GET | `/conversations/:id` | Bare detail |
| GET | `/conversations/:id/messages?limit=30&before=<message UUID>` | `{ items, nextCursor, hasMore }` |
| POST | `/conversations/:id/messages` | Bare message; 201 new / 200 idempotent replay |

Only assigned doctors and booking patients can access clinical conversations. Admin role grants no override. Clinical detail and summary now include appointment dates; beneficiary and doctor photo metadata survive frontend adaptation. The existing appointment video-session endpoint remains unchanged.

## Direct conversations

| Method | Path | Response |
| --- | --- | --- |
| GET | `/direct/contacts?kind=COLLEAGUE\|STAFF\|SUPPORT&search=...` | `{ items: Contact[] }` |
| GET | `/direct/conversations` | `{ items: ConversationSummary[] }` |
| POST | `/direct/conversations` | Bare conversation; body `{ kind, recipientId? }` |
| GET | `/direct/conversations/:id` | Bare detail |
| GET | `/direct/conversations/:id/messages?limit=30&before=<message UUID>` | `{ items, nextCursor, hasMore }` |
| POST | `/direct/conversations/:id/messages` | Bare message; 201 new / 200 replay |

Direct conversations use `direct:<UUID>` in response IDs and call references. Direct path parameters use the raw UUID; the frontend adapter strips the prefix. Treat conversation IDs as opaque everywhere else.

`COLLEAGUE` requires two active approved doctors. `STAFF` requires two active admins. `SUPPORT` requires one admin and one doctor/patient; creating without a recipient assigns an available admin. The requester has one support thread; only its actual members can read it. Contact responses omit email and private account fields.

Both message APIs accept `{ content, idempotencyKey? }`: trimmed text, maximum 2,000 characters, optional UUID key. Reusing a key with different content returns 409. Database constraints and row locks prevent concurrent duplicate sends. Messages return `id`, `conversationId`, `senderId`, `senderRole`, `senderName`, `content`, `createdAt`, `idempotencyKey`.

Summary fields include `kind`, `participant`, `lastMessage`, `unreadCount`, `canSend`, `communicationState`, `unavailableReason`, `videoAvailable`, timestamps, and clinical appointment metadata where applicable. Direct participants may have role ADMIN. History pages are chronological with deterministic `(createdAt, id)` pagination.

## Call signaling

| Method | Path | Body / response |
| --- | --- | --- |
| GET | `/capabilities` | `{ directMessaging, callsAvailable }` |
| GET | `/calls/active` | `{ items: Call[] }`, at most one |
| GET | `/calls?conversationId=<opaque reference>` | `{ items: Call[] }`, most recent 30 |
| POST | `/calls` | `{ conversationId, media: AUDIO\|VIDEO, idempotencyKey: UUID }` → bare Call |
| GET | `/calls/:id` | Bare Call, including terminal state |
| POST | `/calls/:id/actions` | `{ action: accept\|decline\|cancel\|end }` → bare Call |
| GET | `/calls/:id/room` | Daily credentials; `Cache-Control: no-store` |

Call fields: `id`, `conversationId`, `caller`, `callee`, `media`, `status`, `createdAt`, `answeredAt`, `endedAt`, `expiresAt`. People expose userId and name. States: RINGING, ACCEPTED, DECLINED, CANCELLED, MISSED, ENDED.

Only the callee accepts/declines; only the caller cancels; either participant ends an accepted call. Rooms require ACCEPTED plus current conversation access. Busy detection locks both participant accounts in a stable order. Retries with the same caller/key return the existing call; a changed request returns 409. Caller-supplied membership or authorization fields are rejected.

No real provider configured → unavailable capability and 503 on call creation. Permission denial → 403, malformed request → 422, busy/expired/invalid transition → 409. Provider failures return a sanitized 503. Standard error envelope remains `{ code, message, details? }`.

## Integration

1. Build the backend and apply the additive `1761900000000-add-direct-communication` migration in the target environment. It creates only direct conversation, direct message and call tables. It was already applied to the local development database.
2. Restart a compiled backend, or let the existing development watcher reload. Preserve existing MySQL/Redis and auth configuration.
3. Configure Daily through the backend environment for real calls; never place the API key in frontend configuration. Existing issued tokens last until expiry; immediate revocation/ejection is not part of this increment.
4. Run both builds and the tests in the frontend/backend guides.
5. Test two signed-in browsers with distinct accounts: colleague/support messaging, incoming ringing, accept, enter, audio/video, decline, end, offline timeout and busy. Real media requires working browser permissions and Daily configuration.

OpenAPI includes all extension paths and schemas. The disposable verification script creates its own private MySQL socket/data directory under `/tmp`, applies all migrations and deletes only that disposable directory; it never uses the application's database for test rows.
