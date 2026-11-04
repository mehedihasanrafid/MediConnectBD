# Communication implementation — November 4, 2026

Clinical messages remain appointment scoped. New direct messaging and call signaling are separate modules and additive tables; no admin bypass was added to clinical access.

## Modules

- `communication.*`, `typeorm-communication.repository.ts`: existing clinical policy, routes, summaries and messages. Summary includes appointment timing. Eligible conversation synchronization skips existing rows; inbox latest-message/unread queries are batched.
- `direct/direct.entities.ts`: direct conversations and messages; member read boundaries and unique conversation/idempotency keys.
- `direct/direct.policy.ts`: approved colleague, requester/support and admin staff rules; strict membership.
- `direct/direct.store.ts`: safe contacts, deduplicated creation, inbox and detail.
- `direct/direct.messages.ts`: chronological cursor history, read boundary and transactionally serialized sends.
- `direct/direct.views.ts`, `direct/direct.routes.ts`: safe HTTP DTOs, strict input validation and rate limits.
- `calls/call.entity.ts`, `call.policy.ts`: persisted call state and legal participant transitions.
- `calls/call.access.ts`: rechecks direct eligibility or actual clinical appointment video access.
- `calls/call.store.ts`: participant locking, busy checks, idempotency, expiry and history.
- `calls/call.service.ts`: signaling orchestration and real provider credentials after acceptance.
- `calls/call.routes.ts`: authenticated capabilities, active/history/detail/action/room endpoints.

All newly added handwritten feature TS modules are below 150 lines. The server wires these through existing authentication and API routing.

## Data and authorization

Migration `1761900000000-add-direct-communication.ts` creates `direct_conversations`, `direct_messages`, `communication_calls` with foreign keys and history/uniqueness indexes. It is additive and was applied to the local development database. Existing appointments/messages remain untouched. Down migration deliberately refuses destructive communication-history removal.

Only actual thread members can access a direct thread, including admins. Approved active doctors may contact one another. Patients/doctors can have one assigned support thread. Admins can contact other admins. Arbitrary patient contact and patient-to-patient threads are not supported. Contacts return safe display data rather than email or account secrets.

Direct messages and calls explicitly save application timestamps to avoid database-local-time defaults shifting unread/call ordering. History updates its read boundary from the latest message actually returned, only for the newest page. Each send locks its conversation; caller/key uniqueness and participant locks serialize duplicate/concurrent call creation.

Calls ring for up to 45 seconds. Accepted calls last up to 30 minutes and are also limited by a clinical appointment end. Pending calls expire lazily when an active/history request is made; responses compute effective expiry even before persistence catches up. Polling is application-open only; offline push is absent.

Daily credentials require accepted state and current membership. Voice tokens allow audio only; neither direct caller nor admin becomes a Daily room owner. Ending the application call denies new room credentials and the frontend removes its frame. Already-issued provider credentials remain valid until their original expiry: immediate provider-side revocation/ejection is not implemented. Clinical video uses the existing appointment room and authorization rules.

No Daily key means calls are unavailable. The existing mock appointment provider is never advertised as real direct calling. No attachments, fake messages, online presence or read/delivery checkmarks were added.

## Verification commands

```sh
npm run build
npm test
node scripts/verify-communication-expansion.cjs
```

The last command needs a local `/usr/sbin/mysqld` executable. It starts a separate daemon without networking using its own socket and temporary data directory, migrates a fresh database, inserts synthetic users and exercises actual TypeORM SQL. It shuts down that daemon and removes only its generated directory. It does not connect to the configured project database for testing.

Coverage includes membership/admin boundaries, contact eligibility, unread counts, chronological pagination, concurrent idempotency, support/staff, busy locking, accepted-room access, audio-only provider input, decline/cancel/end and missed calls. HTTP tests also cover authentication, admin clinical denial and strict input validation. Daily REST requests are mocked in provider tests; no real paid/provider session is created.

See `frontend/COMMUNICATION_API_HANDOFF.md` in the repository root for the exact HTTP contract, and `frontend/COMMUNICATION_FRONTEND_GUIDE.md` for the UI workflow. The backend OpenAPI document also includes the new endpoints.
