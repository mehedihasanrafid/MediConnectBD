# November 4 communication deliverable

## Completed

The Communication Hub now supports appointment consultations, approved doctor colleagues, assigned admin support, and admin staff threads. Messages persist through the existing authenticated HTTP transport, with automatic updates, history pagination, safe retry keys, unread counts and separate unavailable/empty/error states. Details and call history live in hidden panels; the main screen remains compact and responsive.

Voice/video signaling now persists real ringing, accepted, declined, cancelled, missed and ended states. It enforces busy protection, membership and clinical access windows. Daily credentials are requested only after acceptance and explicit room entry. Existing clinical video entry remains available. The global call controls work across signed-in pages while the application is open.

The actual admin sidebar now consumes its navigation configuration, so the Messages & Support entry is visible and receives the active state. New communication modules and the simplified admin sidebar stay below 150 lines each.

## Changed areas

| Area | Files |
| --- | --- |
| Backend direct messaging | `src/modules/communication/direct/direct.entities.ts`, `direct.policy.ts`, `direct.views.ts`, `direct.store.ts`, `direct.messages.ts`, `direct.routes.ts` |
| Backend calls | `src/modules/communication/calls/call.entity.ts`, `call.policy.ts`, `call.access.ts`, `call.store.ts`, `call.service.ts`, `call.routes.ts` |
| Database | `src/database/migrations/1761900000000-add-direct-communication.ts`, `src/database/data-source.ts` |
| Backend integration | `src/modules/communication/communication.routes.ts`, `communication.types.ts`, `typeorm-communication.repository.ts`; `src/modules/appointments/video-provider.ts`; `src/server.ts`, `src/routes/v1.ts` |
| API documentation | `src/docs/communication-extensions.openapi.ts`, `src/docs/openapi.ts`, `src/modules/communication/README.md` |
| Backend checks | `tests/direct-communication.policy.test.ts`, `direct-communication.routes.test.ts`, `direct-call-provider.test.ts`; `scripts/verify-communication-expansion.cjs`, `scripts/verify-communication/*.cjs` |
| Frontend API/state | `src/communication/api/*`, `types.ts`, `hooks/useConversations.ts`, `hooks/useConversation.ts` |
| Messaging UI | `CommunicationPage.tsx`, its styles; `components/ChatWindow`, `ConversationList`, `MessageHistory`; `NewConversationDialog.tsx`, `ConversationDetails.tsx`, `CommunicationHelp.tsx`, `CommunicationFeatures.tsx` |
| Global call UI | `src/communication/calls/callApi.ts`, `CallContext.ts`, `useCallController.ts`, `CallProvider.tsx`, `CallRoom.tsx`, `Calls.module.css`; `src/App.tsx` |
| Role navigation | `src/communication/CommunicationLayout.tsx`, `src/routes/AppRouter.tsx`, admin sidebar configuration/component/test and account navigation |
| Frontend checks | Communication unit tests; `e2e/communication-expansion.spec.ts`, `communication-calls.spec.ts`, `fixtures/communication-expansion.ts`; intercepted clinical browser script |

Paths in backend rows are relative to `MediConnectBDbackend`; frontend rows are relative to `frontend`. Earlier doctor dashboard, schedule and profile changes were retained, not replaced by this increment.

## Verification results

- Backend: **252 tests passed; 5 existing payment MySQL tests skipped (their optional test socket was not configured)**. Build/type-check passed.
- Frontend: **203 tests passed**. Build/type-check passed. Communication/navigation lint and communication CSS checks passed.
- **32 distinct synthetic browser cases verified** across communication, calls, dashboard, profile and schedule. The initial combined run had one schedule test interrupted by a development hot reload while code was changing. After code stabilized, all 10 communication/call/leave cases passed again, including that case; the other 22 cases had already passed.
- Additional intercepted doctor and patient browser checks passed: persisted history, confirmed send, failed draft, expiry, revocation, retry, mobile flow and the existing denied video-entry behavior.
- Disposable real MySQL checks passed: all migrations, direct persistence, unread clearing, deterministic pagination, membership/admin denial, support/staff, concurrent send idempotency, call transitions, accepted-room authorization and concurrent busy locks. Tests ran on a private temporary MySQL socket and removed only their own data directory.
- The running development doctor page was reviewed with real local API responses. Existing synthetic appointment history, family identity and the hidden details panel loaded successfully. No test messages or calls were sent to user accounts during this review.
- The additive local development migration was applied. Existing appointments and messages were preserved. No production data was changed. No commit or push was made.

## Remaining limits

A real two-person Daily audio/video call still requires manual testing with configured provider credentials and browser microphone/camera permission. Provider REST/media responses were mocked in automated tests. Calls require an open application; there is no offline push. Previously issued provider tokens remain valid until expiry; immediate provider-side ejection/revocation is not implemented. Chat attachments, delivery/read receipts and online presence remain unsupported. The existing large JavaScript bundle warning remains; this increment did not introduce a route-splitting project.

For another environment: build the backend, apply the additive migration, restart the backend if it is not watching source changes, retain existing auth/MySQL/Redis settings, and configure Daily only on the backend. Then open the correct role portal and test with two distinct accounts.

See [frontend guide](COMMUNICATION_FRONTEND_GUIDE.md) and [exact API contract and integration steps](COMMUNICATION_API_HANDOFF.md).
