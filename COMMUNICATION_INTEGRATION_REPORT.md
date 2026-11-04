# Communication integration report — November 3, 2026

## Outcome and scope

The Agent A backend and Agent B frontend are in the same Git working tree at `/home/mehedi/Desktop/MediConnectBD`.
The branch was `main...origin/main` with many existing uncommitted changes. Those changes were preserved.
No commit, push, deployment or production database operation was performed.

The frontend now consumes the actual communication backend, rather than the earlier proposed response shapes.
Both real HTTP and browser verification used synthetic accounts in a newly initialized MySQL data directory.
No HTTP interception was used in the live integration test.

## Confirmed contract

See `frontend/COMMUNICATION_API_HANDOFF.md` for the exact contract.
The list returns `{ items }`; detail and created message are bare objects; message pages return
`{ items, nextCursor, hasMore }`. POST accepts `{ content, idempotencyKey }`, with a 2,000-character limit.
The frontend maps backend `content`/`createdAt` to display `text`/`timestamp`.
Summary and detail include explicit server-derived send/video capabilities and the current counterparty.
Auth uses the existing shared Bearer/cookie-refresh client. All four backend operations verify ownership.
Pagination uses timestamp AND UUID ordering, so equal timestamps do not skip messages.

## Navigation

- `/doctor/communication`: protected DoctorLayout, one full-width doctor header, sidebar below it, active Messages item.
- `/patient/communication`: protected PatientLayout and active patient Messages item.
- `/communication`: role-based redirect; `/messages` remains compatible.
- Existing sidebar collapse and mobile navigation remain available through the existing portal layouts.

## Safety corrections

1. Added `appointments.completed_at`, set once on the confirmed-to-completed transition.
   Standard follow-up expiry is derived from that completion instant, never general `updated_at`.
   Legacy completed visits use scheduled end as a conservative fallback because true past completion times cannot be reconstructed.
   Existing entitlement dates are normalized in returned views; explicitly extended entitlements retain their configured date.
2. Appointment/conversation/message and related membership/entitlement deletions use RESTRICT constraints to preserve history.
   A new forward migration changes existing constraints, not just entity metadata.
   Hardening rollback deliberately requires a reviewed forward migration; it does not restore destructive cascades automatically.
3. Authorization requires the auth user ID, matching profile ID, matching appointment ownership and beneficiary, and family-member ownership.
4. A unique appointment/conversation key prevents concurrent provisioning duplicates. Separate legitimate appointments keep separate threads.
   A later appointment does not reopen an older thread or change its beneficiary.
5. Cancelled, no-show, payment-pending and payment-expired appointments do not provision communication access or permit new sends.
   Previously authorized history remains readable after cancellation/expiry under the current retention policy.
6. Expired messaging is read-only. Missing entitlement metadata fails closed. Backend send authorization is rechecked inside the write transaction.
7. Message retries are scoped to conversation + sender, protected by a unique index and serialized conversation lock.
   Same key/different content is rejected. Cross-role use of the same key cannot replay the other person's message.
8. Test processes skip loading the backend's private `.env`, preventing production/provider settings from leaking into isolated tests.

## Verified use cases

- Doctor and patient see only authorized conversations.
- Patient HTTP and browser composer sends persist; doctor retrieves the same content.
- Doctor HTTP and browser composer replies persist; patient retrieves them.
- Reload preserves database-backed history.
- An unrelated patient receives 403; a forged user ID with a correct profile ID is also denied.
- Expired follow-up windows reject sends while allowing authorized retained history.
- Real browser Load earlier messages fetches another cursor page and displays earlier persisted content.
- Concurrent idempotent sends produce the same message ID; distinct senders remain separate.
- Family beneficiary mismatch is rejected; valid owned family bookings are separately scoped.
- Concurrent conversation discovery and repeated appointments preserve one thread per appointment.
- Deleting an appointment that owns clinical communication is rejected by MySQL.
- Updating unrelated appointment timestamps does not extend follow-up access.
- Real appointment status transition persists the completion timestamp.

## Feature status

| Feature | Status |
|---|---|
| Text conversation list/history/send | Integrated and live verified on isolated services |
| Reload/manual refresh | Implemented and verified; no realtime delivery claim |
| Cursor history pagination | Implemented and live browser verified |
| Scheduled video entry | Preserved through existing Daily appointment authorization; server-derived eligibility |
| Actual two-person Daily media call | Not performed; requires configured provider credentials and devices |
| Standalone audio dialing | Not implemented; no active audio-call control |
| Chat file attachments | Not implemented; no simulated upload |
| Medical reports | Link to existing report workflow; not represented as chat attachments |
| Prescription issuance/amendment | No new controls; local template/conclude-summary tools hidden in Communication's video modal |
| Presence/read checkmarks | No fabricated indicators |

## Database verification and service isolation

A new MySQL instance was initialized at `/tmp/mediconnect-integration-mysql`, bound to `127.0.0.1:33319`.
Only database `mediconnect_communication_integration` and its restricted synthetic test user were used.
All 17 registered migrations applied successfully to a clean schema; subsequent migration runs applied zero changes.
The regression runner inserts only synthetic users, slots, holds, appointments, beneficiaries and messages.
Expected foreign-key and duplicate-key failures were asserted as successful safety checks.
The temporary data directory remains available for local inspection; no production schema was migrated.

A separate Redis ran at port 6399, the real API started through `npm start` at port 4019,
and the frontend started through `npm run dev` at port 5184 with `VITE_API_PROXY_TARGET=http://127.0.0.1:4019`.
These isolated services were stopped after verification. No existing MySQL or Redis service was restarted. Source edits can trigger normal development-server reloads.

Reproduction prerequisites: initialize/start a disposable MySQL instance on port 33319; never point the runner at a real database.
The database regression runner enforces the exact database name/port before making changes.
Set `NODE_ENV=test`, DB variables for that isolated database, and a synthetic JWT secret; build the backend first.
Run `node scripts/verify-communication-integration.cjs` from the backend folder.
Then start API/Redis/frontend at the ports above and run `node src/communication/tests/communication.live.mjs` from frontend.
The live browser script reads synthetic fixture identities from `/tmp/mediconnect-communication-fixtures.json`.

## Tests and builds

- Backend production build: passed.
- Frontend production build: passed (existing application bundle-size warning remains).
- Focused backend regression set: 80 tests passed across communication service/policy, appointment service, router wiring and OpenAPI tests.
- Focused frontend communication tests: 24 passed.
- Real MySQL regression runner: passed, including migrations, concurrency, retention, identity and beneficiary checks.
- Real HTTP + browser runner: passed for both roles, including persisted sends, reply, reload, denial, expiry, sidebar and older-page retrieval.
- Existing fixture tests are separate from live verification and are not presented as backend evidence.

## Exact files changed in this integration pass

Paths are repository-relative; files from the earlier sprints retain their other changes.

Backend:
- `MediConnectBDbackend/src/config/env.ts`
- `MediConnectBDbackend/src/database/data-source.ts`
- `MediConnectBDbackend/src/database/migrations/1761800000000-harden-communication.ts` (new)
- `MediConnectBDbackend/src/modules/appointments/appointment.entity.ts`
- `MediConnectBDbackend/src/modules/appointments/typeorm-appointment.repository.ts`
- `MediConnectBDbackend/src/modules/communication/communication-policy.ts` (new)
- `MediConnectBDbackend/src/modules/communication/communication.types.ts`
- `MediConnectBDbackend/src/modules/communication/typeorm-communication.repository.ts`
- `MediConnectBDbackend/src/modules/communication/conversation.entity.ts`
- `MediConnectBDbackend/src/modules/communication/message.entity.ts`
- `MediConnectBDbackend/src/docs/openapi.schemas.ts`
- `MediConnectBDbackend/tests/communication-policy.test.ts` (new)
- `MediConnectBDbackend/scripts/verify-communication-integration.cjs` (new)

Frontend:
- `frontend/vite.config.ts`
- `frontend/src/routes/AppRouter.tsx`
- `frontend/src/doctor/navigation/DoctorSidebar/DoctorSidebar.tsx`
- `frontend/src/doctor/navigation/DoctorHeader/DoctorHeader.tsx`
- `frontend/src/patient/navigation/PatientSidebar/PatientSidebar.tsx`
- `frontend/src/communication/CommunicationLayout.tsx`
- `frontend/src/communication/CommunicationPage.tsx`
- `frontend/src/communication/api/communicationApi.ts`
- `frontend/src/communication/api/communicationErrors.ts`
- `frontend/src/communication/hooks/useConversation.ts`
- `frontend/src/communication/components/MessageComposer/MessageComposer.tsx`
- `frontend/src/communication/components/MessageHistory/MessageHistory.tsx`
- `frontend/src/communication/components/ConversationList/ConversationList.tsx`
- `frontend/src/communication/components/ChatWindow/ChatWindow.tsx`
- `frontend/src/communication/components/VideoModal/VideoModal.tsx`
- `frontend/src/patient/appointments/components/VideoSessionPanel/VideoSessionPanel.tsx`
- `frontend/src/communication/tests/communicationApi.test.ts`
- `frontend/src/communication/tests/communication.browser.mjs`
- `frontend/src/communication/tests/communication.live.mjs` (new)
- `frontend/COMMUNICATION_API_HANDOFF.md`
- `frontend/COMMUNICATION_FRONTEND_GUIDE.md`
- `COMMUNICATION_INTEGRATION_REPORT.md` (this file)

## Remaining limitations

No realtime sockets/push, standalone audio calling, or chat attachment endpoint was added.
Provider media connectivity was not tested. Legacy true completion times are unknown; fallback is documented above.
Explicit retention/deletion durations still require a product decision; RESTRICT prevents accidental cascades, not authorized retention purges.
Older Agent A repository/entity files and shared VideoSessionPanel already exceed the 150-line guideline; this pass preserves their existing structure.
The safety migration is not applied to the user's normal development or production database.
No deployment, commits or pushes were made.

## Development setup follow-up

At the user's subsequent request for seed data, the normal localhost development database
(`mediconnect`, port 3306, `.env` explicitly `development`) was checked and found to be missing
both communication migrations. Those two pending migrations were applied successfully.
`scripts/seed-communication-demo.cjs` and `npm run seed:communication` now add development-only,
clearly labeled persisted scenarios for the existing demo accounts, preserving credentials.
Both authenticated roles returned HTTP 200 through the normal frontend proxy and retrieved seed history.
See `MediConnectBDbackend/scripts/COMMUNICATION_DEMO.md`. Production was not used.
