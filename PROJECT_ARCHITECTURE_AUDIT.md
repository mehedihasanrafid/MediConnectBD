# MediConnect BD — Architecture, Codebase and Risk Audit

**Audit date:** November 4, 2026  
**Scope:** Handwritten frontend/backend source, manifests, route composition, migrations, tests, deployment assets and relevant documentation. Private `.env` values, generated `dist`, dependencies, and binary assets were not read or copied.  
**Working-tree note:** The repository has substantial uncommitted feature/deployment work. Findings distinguish implemented source from claims in UI/documentation. No commit, migration, seed, deployment, or production-data change was made by this audit.

## 1. Executive assessment

MediConnect BD is a **modular-monolith healthcare application** with a workable technical foundation and broad feature coverage. The API is structured better than the user interface: Express routes, services, repositories, TypeORM entities/migrations, validation, and tests are consistently present in most backend domains.

The main risks before a public launch are not a missing framework. They are:

1. **Truthfulness/security gaps:** the interface and older documentation claim encryption, realtime status, LiveKit and other capabilities that the running code does not implement.
2. **Sensitive-data design:** medical-report files are stored as plain Base64 in MySQL (`content_base64`), not encrypted application data or private object storage.
3. **Uncommitted/partial cleanup:** large parts of the communication and deployment work are uncommitted; recent AGY cleanup produced untracked Radar files that are not yet integrated.
4. **Oversized high-coupling files:** repositories, appointment/UI pages, video and prescription components exceed the project's 150-line target by a large margin.
5. **Release readiness:** payments, Daily media, email, secure storage, retention/deletion policy, audit logging, and deployment configuration require production decisions and real-provider verification.

The code does **not** show evidence of end-to-end encryption for chat, report data, prescription data, or database fields. Passwords and some tokens are handled correctly; transport security is expected to be supplied by HTTPS/reverse proxy in deployment.

## 2. Technology actually used

| Layer | Confirmed technology | Where / purpose |
|---|---|---|
| Frontend | React 19, TypeScript, Vite 8 | `frontend/src`, SPA build |
| Client routing | React Router | `frontend/src/routes/AppRouter.tsx` |
| UI | CSS Modules, Radix UI, Lucide, `clsx` | `frontend/src/**`, no large UI framework |
| Client tests | Vitest, React server rendering; Playwright listed | `frontend/src/**/tests`, `frontend/e2e` |
| API | Node.js, Express 5, TypeScript | `MediConnectBDbackend/src/app.ts`, `server.ts` |
| Validation | Zod | module `*.schema.ts` files |
| Persistence | MySQL 8, TypeORM, explicit migrations | `src/database`, entities/repositories |
| Cache/jobs | Redis, BullMQ | `src/workers/worker.ts`, reminder/system queues |
| Auth | bcryptjs, JWT HS256 access token, opaque hashed refresh token | `src/modules/auth` |
| Payments | SSLCommerz provider, local mock provider | `src/modules/payments` |
| Video | Daily.co REST room/token provider, local mock | `src/modules/appointments/video-provider.ts` |
| Email | Nodemailer/SMTP or console fallback | `src/modules/notifications` |
| Docs/logging | OpenAPI/Swagger, Pino, Helmet, CORS | `src/docs`, `app.ts` |
| Demo deployment assets | Docker, Compose, Caddy | `compose.demo.yml`, `deploy/demo`, Dockerfiles |

### Technologies claimed but not installed/implemented

- **Socket.IO:** not in either package manifest; communication uses REST plus manual refresh.
- **LiveKit:** not in either package manifest; actual video integration targets Daily.co.
- **S3-compatible private storage:** no S3 SDK/provider implementation. Reports are stored in MySQL Base64.
- **Application-level data encryption / E2EE:** no field encryption, key management, or end-to-end chat encryption implementation was found.

Update `MediConnectBDbackend/docs/BACKEND_ARCHITECTURE_AND_CODE_STANDARD.md` and misleading UI copy before public use.

## 3. Repository map and size

| Area | Files | Lines | Responsibility |
|---|---:|---:|---|
| `frontend/src` | 528 | 51,433 | React pages, portals, API client, components, styles and tests |
| `MediConnectBDbackend/src` | 160 | 16,039 | Express API, domain modules, TypeORM, jobs and OpenAPI |
| `MediConnectBDbackend/tests` | 27 | 4,355 | Backend unit/HTTP/provider/worker tests |

The frontend has three role portals: patient, doctor and admin. `frontend/src/routes/AppRouter.tsx` is the authoritative route table. `frontend/src/App.tsx` owns global ErrorBoundary, theme, toast and notification providers.

The backend is a modular monolith. `MediConnectBDbackend/src/server.ts` is the dependency-composition root; `src/routes/v1.ts` mounts module routers below `/api/v1`; `src/app.ts` owns middleware, health, OpenAPI, rate limits and error handling.

### Largest maintainability hotspots

| File | Lines | Why it needs work |
|---|---:|---|
| `backend/src/modules/appointments/typeorm-appointment.repository.ts` | 833 | Holds booking, holds, cancellation, rescheduling, completion and complex transactional SQL in one class. |
| `backend/src/database/seeds/run-seeds.ts` | 827 | Synthetic data is too monolithic; split catalog/accounts/scenarios. |
| `frontend/src/doctor/dashboard/components/IssuePrescriptionModal/IssuePrescriptionModal.tsx` | 743 | Form state, validation, drug selection and UI are coupled. |
| `backend/src/modules/doctors/typeorm-doctor.repository.ts` | 743 | Directory, profile, schedule and admin persistence logic are over-coupled. |
| `frontend/src/patient/appointments/components/VideoSessionPanel/VideoSessionPanel.tsx` | 695 | Device/lobby/session/post-consultation concerns need separate components/hooks. |
| `frontend/src/doctor/appointments/DoctorAppointmentsPage.tsx` | 614 | Page state, filtering, actions and drawers should be feature hooks/components. |
| `backend/src/modules/admin/typeorm-admin.repository.ts` | 547 | Separate user, catalog, operation and refund query objects. |
| `backend/src/modules/communication/typeorm-communication.repository.ts` | 544 | Correctly security-sensitive, but should be split by provisioning, read queries and message writes. |
| `backend/src/modules/appointments/appointment.service.ts` | 424 | Split booking/hold/cancellation/consultation services. |
| `frontend/src/doctor/profile/hooks/useDoctorProfile.ts` | 436 | One hook owns many independent profile workflows. |

The recently cleaned Doctor Earnings feature is an example of the desired pattern: `DoctorEarningsPage.tsx` is now 43 lines and delegates to small hook/presentation modules.

## 4. Backend module ownership

| Module | Main responsibility | Important files |
|---|---|---|
| `auth` | Registration, login, refresh rotation, logout, bearer middleware | `auth.service.ts`, `access-token.service.ts`, `typeorm-auth.repository.ts` |
| `doctors` | Public directory, profiles, chambers, approval, catalog access | `doctor.routes.ts`, `doctor.service.ts`, `typeorm-doctor.repository.ts` |
| `scheduling` | Weekly schedules, time off, generated concrete slots | `scheduling.service.ts`, `slot-generator.ts` |
| `appointments` | Holds, booking, cancellation/refund decision, reschedule, completion, video authorization | `appointment.service.ts`, `typeorm-appointment.repository.ts`, `video-provider.ts` |
| `payments` | Idempotent initiation, SSLCommerz verification/reconciliation, unpaid expiry | `payment.service.ts`, provider/repository files |
| `patients` | Family beneficiaries and medical reports | family/report service/repository/entity files |
| `prescriptions` | Draft/issue/version/verification/PDF-facing endpoint rules | `prescription.service.ts`, repository/entity |
| `communication` | Appointment-bound threads, entitlement window, messages, idempotency and access policy | `communication-policy.ts`, `typeorm-communication.repository.ts` |
| `notifications` | In-app records, email transport, scheduled reminders | notification/reminder files |
| `admin`, `reviews`, `health` | Operational/admin workflow, feedback, liveness/readiness | respective route/service files |

There are 17 ordered migrations. `synchronize: false` is correctly set in `src/database/data-source.ts`. The latest two migrations add and harden communication tables; do not apply them to production without a reviewed backup/rollout plan.

## 5. Frontend ownership map

| Area | What it does |
|---|---|
| `frontend/src/api` | Shared REST client plus domain API wrappers. `client.ts` owns in-memory access tokens and refresh retry. |
| `features/auth` | Login, registration and `AuthContext`; refresh cookie restores an in-memory access token after reload. |
| `public` | Home, doctor discovery/detail, prescription verification and public shell. |
| `patient` | Appointment/hold/payment/video, family, reports, prescriptions, sidebar/header. |
| `doctor` | Dashboard, appointments, consultation workflow, earnings, prescriptions, profile, schedule and settings. |
| `admin` | Applications, users, catalog, overview and operational tables. |
| `communication` | Authorized conversations, history pagination, sending and Daily entry point. |
| `notifications` | In-app notification context, bell and page. |
| `shared` | Types, UI primitives, themes, formatters, status/error/role helpers. |
| `layouts` / `routes` | Role layouts, route protection and route composition. |

## 6. Authentication, tokens and security

### Confirmed implementation

1. Passwords are bcrypt-hashed. `AuthService` uses a dummy bcrypt hash for unknown users to reduce login timing differences.
2. Access tokens are JWT HS256 with fixed issuer/audience, UUID subject/session ID, role claims, 15-minute default lifetime and an allowlisted Zod claim shape. See `access-token.service.ts`.
3. Refresh tokens are 48 random bytes, returned only for an HTTP-only cookie, SHA-256 hashed before persistence, rotated on use, and reuse is rejected. See `auth.service.ts`.
4. The browser keeps only the access token in memory. `frontend/src/api/client.ts` uses `credentials: include`, one shared refresh request, then retries one 401.
5. Every authenticated request reloads the user and current role/status from the database. Account suspension is immediate.
6. Express uses Helmet, disables `x-powered-by`, redacts auth/cookie headers from Pino logs, sets JSON size limit 5 MB, uses strict CORS to `APP_URL`, and rate-limits login/registration and prescription verification.
7. Communication sends are server-authorized again inside the write path; sender-scoped idempotency and unique database indexes prevent duplicate message retry effects.

### Security limitations to resolve

- Logout revokes the refresh session but **already issued access JWTs remain valid until their short expiry**; this is documented in `auth.service.ts`. This is acceptable only with a short TTL and clear security policy; high-risk logout can add session-version/revocation checks.
- There is no CSRF-specific token strategy documented for cookie endpoints. Verify same-site cookie attributes and cross-origin deployment behaviour before production.
- `MockVideoProvider` is safe only for local development. Production startup should fail closed when Daily credentials are missing, rather than issuing mock room data.
- Logs should be reviewed to ensure they never include report content, prescription content, payment payloads, or raw provider responses.
- Healthcare privacy needs audit events, least-privilege operational access, retention/deletion policy, backups/encryption requirements, incident response and legal review; these are not implementation details that can be inferred from UI text.

## 7. Encryption and medical data — actual state

| Claim / concern | What code actually does | Required correction |
|---|---|---|
| Password protection | bcrypt hashes passwords | Keep; tune cost only after load testing. |
| Tokens | JWT signature + SHA-256 refresh-token storage | Keep; rotate secrets through platform secret storage. |
| HTTPS | Expected from Caddy/reverse proxy in deployment | Enforce production HTTPS and secure cookies. |
| Chat encryption | Messages are plaintext `text` in MySQL | Do not claim E2EE/AES unless a designed key-management solution exists. |
| Medical reports | `medical_reports.content_base64` stores raw Base64 in MySQL; Base64 is **not encryption** | Move blobs to private encrypted object storage; store key/version/object reference in DB. |
| Prescription “encrypted QR” UI text | No encryption implementation found | Change copy to “verification code” unless cryptographic signing is implemented and audited. |
| Daily calls | Daily private rooms/tokens are configured when credentials exist | Verify provider encryption/privacy settings and perform real two-party test. |

Medical-report authorization is meaningful but too broad for a clinical privacy rule: a doctor may download a report if **any** appointment relationship exists (`typeorm-medical-report.repository.ts`). Decide whether access must instead be limited to active treatment/consent/appointment windows.

## 8. Redis, queues and worker

Redis is not the source of truth. MySQL remains the transactional store; Redis carries BullMQ work.

- API process: connects to MySQL and Redis during startup and uses both in `/health/ready`.
- Worker: `src/workers/worker.ts` creates system and reminder queues/workers.
- System jobs: unpaid appointment hold/payment expiry and reconciliation-oriented maintenance.
- Reminder queue: sends 24-hour and 30-minute appointment reminders through SMTP or console transport.
- Current constraint: worker concurrency is `1`; fine for a small demo, not sized for public traffic.

## 9. Communication module — current, verified state

### Flow

```text
React CommunicationPage
  -> hooks/useConversations + useConversation
  -> communicationApi + shared authenticated client
  -> /api/v1/communication/*
  -> Express route/controller/service
  -> authorization/entitlement policy + TypeORM repository
  -> MySQL conversations, participants, entitlements and messages
```

### Implemented

- Doctor/patient protected portal routes: `/doctor/communication`, `/patient/communication`.
- Conversation list/detail, message history, 30-message cursor pagination, composer, loading/empty/server-error/retry states and responsive list/chat layout.
- Appointment-bound authorization, counterparty/beneficiary checks, 7-day default completed-consultation window, read-only expiry, cancel/payment-pending denial and retention-safe foreign keys.
- Message idempotency: `(conversationId, senderId, idempotencyKey)` unique index; replay returns same message and conflicting body is rejected.
- Existing appointment/Daily video entry remains available only when backend says the scheduled video session is eligible.
- No fake messages, presence, delivery/read checkmarks, latency or fake attachments in the current communication UI.

### Not implemented / intentionally unavailable

- Realtime push, WebSocket/Socket.IO delivery, typing indicators, presence or read receipts.
- Chat attachments or file share; medical reports are separate workflow.
- Standalone audio dialing.
- Real two-person Daily media-device/provider verification in production.
- Explicit communication retention/purge policy and legal review.

The verified contract and integration limits are documented in `frontend/COMMUNICATION_API_HANDOFF.md` and `COMMUNICATION_INTEGRATION_REPORT.md`.

## 10. Booking, payment, video and prescriptions

- **Booking:** server-side 10-minute holds, one-hour minimum lead time, overlap checks, family beneficiaries, confirmation/cancel/reschedule/complete transitions. Appointment repository should be decomposed but is functionally central.
- **Payment:** request idempotency, provider callback verification and exact amount/currency/transaction comparison are good foundations. Sandbox credentials, public HTTPS callback, provider retry/reconciliation and refund execution still need operational testing.
- **Video:** Daily provider creates private expiring rooms and role-specific tokens. In a missing-key environment the application uses a mock provider; never expose that fallback in public production.
- **Prescriptions:** routes, verification, versions and PDF-facing functions exist. Clinical safety, medicine data governance, legal prescription signing and true QR cryptography require a separate clinical/compliance review.

## 11. Documentation and code truth problems

1. `BACKEND_ARCHITECTURE_AND_CODE_STANDARD.md` says Socket.IO, LiveKit, S3 storage and PDF library are standard; present package/source code contradicts Socket.IO, LiveKit and S3 claims.
2. Several frontend pages/notifications use terms such as “AES-256”, “Encrypted Records”, “Realtime Synced”, fixed latency and encrypted QR. These are unsupported by the current implementation and should be removed or replaced with accurate text.
3. Root README describes a `docker-compose.yml`, while the current public-demo asset is `compose.demo.yml`; startup instructions need a single verified source of truth.
4. Current uncommitted files must be reviewed and grouped into a clean feature branch before deployment.

## 12. Test and build evidence

**Run during this audit:**

- Backend: `npm test` → **236 passed, 5 skipped**; `npm run typecheck` → passed.
- Frontend: `npm test` → **175 passed across 43 files**.
- Frontend production build had passed in this work session. Vite reports one existing large JavaScript bundle (about 896 KB before gzip), so route-level code splitting should be planned.

The initial backend test attempt failed only because the restricted runner could not bind a loopback HTTP port. The same suite passed when rerun with local-loopback permission. The skipped tests should be named and documented in CI rather than silently accepted.

## 13. Current uncommitted state and immediate cleanup concern

The working tree contains meaningful uncommitted communication, Docker/demo, navigation and cleanup work. Preserve it; do not reset the tree.

The Doctor Earnings cleanup is coherent and build-tested. By contrast, these untracked AGY-created files are currently not integrated into `TodayPatientRadar.tsx` and should be reviewed or removed before a commit:

- `frontend/src/doctor/dashboard/components/TodayPatientRadar/PatientQueueCard.tsx`
- `frontend/src/doctor/dashboard/components/TodayPatientRadar/RadarEmptyState.tsx`
- `frontend/src/doctor/dashboard/components/TodayPatientRadar/RadarFilterToolbar.tsx`
- `frontend/src/doctor/dashboard/components/TodayPatientRadar/RadarHeader.tsx`
- `frontend/src/doctor/dashboard/components/TodayPatientRadar/types.ts`

Do not continue automated cleanup on shared files without explicit file ownership and a build/test after each small refactor.

## 14. Prioritized plan

### P0 — before any public medical demo

1. Remove unsupported encryption/realtime/LiveKit/S3 claims from UI and docs.
2. Decide and implement private encrypted medical-file storage; migrate report blobs out of MySQL before uploading real patient documents.
3. Make production configuration fail closed for missing Daily/payment/email secrets; use secret management, HTTPS, secure cookies and correct CORS domain.
4. Apply/review migrations on a disposable staging database; run full API, payment callback and two-person Daily tests there.
5. Create policy decisions for privacy, report/communication retention, deletion, audit logging, backup/restore, consent and incident response.

### P1 — code structure

1. Finish or remove the incomplete Patient Radar extraction, then test it.
2. Split appointment repository by holds, booking, cancellation/reschedule and doctor queries.
3. Split `VideoSessionPanel`, `IssuePrescriptionModal`, doctor appointment page and doctor profile hook along UI/state/API boundaries.
4. Split communication repository by provision/read/write while retaining transaction and authorization tests.
5. Split seeds into catalog, accounts, appointment scenarios and communication demo data.
6. Add a CI size guard: new handwritten `.ts/.tsx` files at <=150 lines except explicit approved adapters, repositories, generated schemas and test fixtures.

### P2 — missing product capabilities

1. Realtime messaging only after selecting and implementing a secure delivery model (WebSocket/SSE plus authorization/reconnect/audit design).
2. Attachments only after secure object storage, malware scanning, content-type verification, access grants and retention are ready.
3. Video device/support flows, connection-quality handling and call audit metadata.
4. Route-level code splitting and performance budgets.
5. E2E test suite that exercises patient booking → sandbox payment → confirmation → video eligibility → completion → communication → prescription/report access.

## 15. Safe development rules

- Keep API contract DTOs/types close to each domain; generate or share types only deliberately.
- A route/controller parses and delegates; service owns business policy; repository owns persistence/transactions; components render; hooks own client state; API files perform HTTP only.
- Never place credentials, API keys, raw medical files or demo passwords in frontend source or reports.
- One feature/folder owner at a time; no concurrent edits to shared routes, types, repository or migration files.
- Every refactor must retain behavior, run focused tests, then run relevant build/type-check before commit.
- Do not commit until the uncommitted communication, deployment and cleanup work has been reviewed as a coherent change set.

---

## Appendix A. How the application runs

### Local runtime sequence

```text
Browser
  -> Vite development server (:5173)
  -> /api/v1 proxy or production reverse proxy
  -> Express API (:4000)
     -> MySQL (persistent application data)
     -> Redis (BullMQ queue transport/readiness)
     -> SSLCommerz (when sandbox credentials configured)
     -> Daily.co (when provider credentials configured)
     -> SMTP (when configured)

Separate worker
  -> Redis/BullMQ
  -> MySQL + SMTP
  -> expires unpaid work and processes appointment reminders
```

The API cannot start correctly without its environment configuration, MySQL and Redis. The frontend can render without the API, but protected screens cannot fetch data or sign in. This is why a running Vite page redirected to login but could not display the real Earnings dashboard when the backend was stopped.

### Backend startup files, in order

| File | Exact responsibility |
|---|---|
| `MediConnectBDbackend/src/config/env.ts` | Loads backend `.env`, validates variable shape and conditionally requires provider settings as groups. Never put real values in source. |
| `src/database/data-source.ts` | Registers all TypeORM entities and the explicit ordered migration list. This is the database schema authority. |
| `src/server.ts` | Initializes MySQL, connects Redis, constructs repositories/services/providers and starts HTTP. This is the dependency-injection composition root. |
| `src/app.ts` | Builds Express middleware pipeline: request ID, Pino, Helmet, CORS, JSON parsing, cookies, health/docs, rate limits, v1 API and error handlers. |
| `src/routes/v1.ts` | Mounts domain routers below `/api/v1`; it should stay wiring-only. |
| `src/workers/worker.ts` | Starts a separate process for BullMQ system jobs and reminder jobs. |

### Frontend runtime files, in order

| File | Exact responsibility |
|---|---|
| `frontend/src/main.tsx` | Browser entry, React root and router bootstrap. |
| `frontend/src/App.tsx` | Global ErrorBoundary, theme, toast, notification provider, public-demo notice and route table. |
| `frontend/src/routes/AppRouter.tsx` | All public/patient/doctor/admin URL-to-page mappings. |
| `frontend/src/routes/guards.tsx` | Authenticated/role route boundary. |
| `frontend/src/features/auth/AuthContext.tsx` | Current user, first-load refresh session, login/register/logout state. |
| `frontend/src/api/client.ts` | Shared fetch transport: in-memory bearer token, cookie credential inclusion, one-at-a-time refresh and retry after a 401. |
| `frontend/src/api/*.ts` | Domain-specific HTTP calls; should not contain visual state. |
| `frontend/src/layouts/*.tsx` | Role shell, navigation, header/content frame. |

## Appendix B. API map by business capability

The API base prefix is `/api/v1`. Exact request validation lives beside each feature in `*.schema.ts`; exact response documentation is served at `/api-docs/` and `/openapi.json`.

| Prefix / module | Main operations | Main code |
|---|---|---|
| `/auth` | Patient/doctor registration, login, refresh, logout, current account | `modules/auth/*.routes.ts`, controller/service/repository |
| `/doctors` | Public directory/search/detail, own profile, availability, schedules/slots | `modules/doctors`, `modules/scheduling` |
| `/admin/doctors`, `/admin` | Doctor approval, users, catalogs, operations/refunds | `modules/doctors/doctor.routes.ts`, `modules/admin` |
| `/catalog` | Public specialties and hospitals | doctor catalog router/service |
| `/appointments` | Hold slot, book, release hold, list, cancel, reschedule, complete, video session | `modules/appointments` |
| `/payments` | Initiate checkout, provider callback, owned status, reconciliation | `modules/payments` |
| `/patients/me/family-members` | Family beneficiary CRUD | `modules/patients/family-member.*` |
| `/patients/me/reports` | Report upload/list/download/delete | `modules/patients/medical-report.*` |
| `/prescriptions` | Create/list/edit/verify/download prescription work | `modules/prescriptions` |
| `/reviews` | Patient review workflow | `modules/reviews` |
| `/notifications` | In-app list/read/mark read | `modules/notifications` |
| `/communication` | Conversation list/detail/history/send | `modules/communication` |
| `/health` | Liveness/readiness | `modules/health` |
| `/api-docs`, `/openapi.json` | Swagger UI and generated OpenAPI | `src/docs` |

### Critical API sequence: patient booking through payment

```text
Patient selects server-generated slot
  -> POST hold
  -> MySQL lock/overlap/lead-time checks
  -> 10-minute hold
  -> POST booking from that hold
  -> chamber appointment confirms OR video appointment awaits payment
  -> POST payment initiation with idempotency key
  -> SSLCommerz hosted checkout
  -> callback/reconcile verifies provider transaction, amount, currency and validation ID
  -> appointment becomes confirmed
  -> worker expires overdue unpaid work safely/idempotently
```

Client callback/query parameters must never be treated as proof of payment. The current `PaymentService` correctly verifies server-side provider evidence before applying a successful state transition.

## Appendix C. Main database relationships

```text
User
 ├─ PatientProfile ── FamilyMember
 ├─ DoctorProfile ── DoctorChamber / DoctorSchedule / AppointmentSlot
 ├─ Role (membership)
 └─ RefreshSession

AppointmentSlot -> SlotHold -> Appointment
Appointment -> Payment / PaymentEvent / Refund
Appointment -> Prescription / Review
Appointment -> Conversation (one per appointment)

Conversation -> ConversationParticipant (doctor + patient user)
Conversation -> CommunicationEntitlement
Conversation -> Message (many)

PatientProfile -> MedicalReport
DoctorProfile + PatientProfile relationship -> report-access check
```

### Important tables/entities and their purpose

| Entity file | What it stores | Risk/notes |
|---|---|---|
| `users/user.entity.ts` | Account identity/status | Never serialize password hash. |
| `auth/refresh-session.entity.ts` | Hashed rotating refresh sessions | Revocation source of truth. |
| `appointments/slot-hold.entity.ts` | Short-lived booking reservation | Must remain lock/expiry protected. |
| `appointments/appointment.entity.ts` | Confirmed/cancelled/completed clinical booking | `completedAt` now supports communication expiry. |
| `payments/*.entity.ts` | Intent, callback events, refund records | Must preserve provider audit trail. |
| `patients/medical-report.entity.ts` | Report metadata and Base64 blob | Current privacy/storage weakness. |
| `prescriptions/prescription.entity.ts` | Prescription and version history | Requires clinical/legal review for production. |
| `communication/conversation.entity.ts` | Appointment-bound thread and entitlement | Uses RESTRICT foreign keys to preserve history. |
| `communication/message.entity.ts` | Persisted plain-text messages | Idempotency unique index protects retries. |

## Appendix D. Authentication at request level

### Login

1. Browser posts credentials to `/api/v1/auth/login`.
2. `AuthService.login()` finds the user, verifies bcrypt (or a dummy hash for an unknown email), and checks account status.
3. The service creates a refresh-session database row containing only a SHA-256 token hash.
4. Controller sends raw refresh token as HTTP-only cookie and access JWT in response body.
5. `AuthContext` stores access JWT in JavaScript memory, not localStorage.

### Normal protected request

1. `api/client.ts` adds `Authorization: Bearer <access JWT>`.
2. `createAuthenticate()` verifies signature, `HS256`, issuer, audience, expiry and claims.
3. Middleware reloads the user from database to enforce current status/roles.
4. Route enforces broad role; service/repository enforce ownership/clinical policy.

### Expired access JWT

1. Shared client receives one 401.
2. It issues one cookie-authenticated `/auth/refresh` request, shared by concurrent calls.
3. Server rotates refresh token, invalidating the presented session token and issuing a replacement.
4. Client retries the original request once. A failed refresh clears in-memory access token.

## Appendix E. Communication API and UI detail

### Exact endpoints

| Method | URL | Body / result |
|---|---|---|
| GET | `/communication/conversations` | `{ items: ConversationSummary[] }` |
| GET | `/communication/conversations/:id` | one `ConversationDetail` |
| GET | `/communication/conversations/:id/messages?limit=30&before=<uuid>` | `{ items, nextCursor, hasMore }` |
| POST | `/communication/conversations/:id/messages` | `{ content, idempotencyKey? }` -> message; 201 new, 200 replay |

### Backend file responsibilities

| File | Responsibility |
|---|---|
| `communication.routes.ts` | Auth/role gates and URL binding. |
| `communication.controller.ts` | Parses params/query/body and converts result to HTTP. |
| `communication.schema.ts` | Zod input limits, including 2,000-character message content. |
| `communication.service.ts` | Domain-facing orchestration and injected clock. |
| `communication-policy.ts` | Appointment/member identity checks, entitlement expiry, send/video capability. |
| `communication.repository.ts` | Persistence port/interface. |
| `typeorm-communication.repository.ts` | Provisioning, query, pagination, lock/idempotency and database security. |
| `conversation.entity.ts`, `message.entity.ts` | Schema and relationship metadata. |

### Frontend file responsibilities

| File/folder | Responsibility |
|---|---|
| `CommunicationLayout.tsx` | Role-aware redirect/portal composition. |
| `CommunicationPage.tsx` | Page-level selection and mobile list/chat state. |
| `api/communicationApi.ts` | Response adapter/validation entry; maps API `content/createdAt` to display fields. |
| `hooks/useConversations.ts` | List lifecycle, load/error/reload/block state. |
| `hooks/useConversation.ts` | Thread history, load-earlier cursor, send/retry/idempotency lifecycle. |
| `ConversationList`, `MessageHistory`, `MessageComposer`, `ChatWindow` | Render and interaction components. |
| `VideoModal.tsx` | Reuses appointment-authorized Daily entry, with non-communication clinical controls suppressed. |

### Communication policy in plain language

- A doctor sees only conversations matching both their authenticated user and doctor profile.
- A patient sees only conversations matching both their authenticated user and patient profile; family bookings must belong to that patient profile.
- A conversation belongs to exactly one appointment; separate appointments have separate threads.
- Messages can be sent only during the server-derived active window. Expired/cancelled/unpaid threads are read-only or unavailable.
- History is intentionally retained after expiry/cancellation under current policy, but product/legal retention duration still needs a decision.
- Manual refresh checks for new messages. There is no pushed delivery or unread/read-receipt semantics.

## Appendix F. Concrete refactor design, not just line limits

### Pattern for a React feature

```text
doctor/<feature>/
  <Feature>Page.tsx            # composition only, target <=150 lines
  hooks/use<Feature>.ts        # fetching/mutations/local orchestration
  components/<Part>.tsx        # presentation; receives typed props
  api.ts or ../../api/<domain> # HTTP calls only
  types.ts                     # feature DTO/view state when shared types do not fit
  tests/                       # user-visible behavior and error states
```

For example, `DoctorAppointmentsPage.tsx` should become: `useDoctorAppointments`, filter utilities, `AppointmentToolbar`, `AppointmentList`, `AppointmentRow`, and existing modal/drawer components. Completion/cancellation/network mutations must remain in the hook/API layer, never be duplicated inside cards.

### Pattern for a backend domain

```text
<domain>/
  <domain>.routes.ts           # route + middleware only
  <domain>.controller.ts       # parse/serialize HTTP only
  <domain>.schema.ts           # Zod external inputs
  <use-case>.service.ts        # business policy
  <domain>.repository.ts       # persistence interface
  typeorm-<domain>.repository.ts or focused query classes
  *.entity.ts                  # TypeORM mapping only
  <domain>.types.ts            # stable DTOs/domain views
```

The appointment repository should be split into focused query/write collaborators, but preserve one transaction boundary around each state-changing use case. Do **not** split it merely by arbitrary line counts if that would lose locks or make booking/payment transitions inconsistent.

## Appendix G. Release gates for a public synthetic demo

1. Keep only synthetic accounts and clearly label the site as a demo.
2. Confirm `NODE_ENV=production`, `PUBLIC_DEMO=true`, strong non-placeholder secrets, HTTPS domain and same-origin API proxy.
3. Run migrations first on a disposable/staging database; back up before any real shared database action.
4. Seed only approved synthetic data; never use a broad reset command.
5. Configure SSLCommerz sandbox callback URL through public HTTPS and test provider verification, not only browser success pages.
6. Configure Daily credentials and execute an actual doctor/patient call with camera/mic permission and expiry checks.
7. Verify logout, refresh, suspended-account denial, doctor/patient cross-account denial, expired communication denial and report-access boundaries.
8. Remove unsupported security marketing language and publish a plain demo/privacy notice.
9. Capture build/test result, migration version and image/version hash in a release note.
10. Commit reviewed work in small, feature-scoped commits only after this working tree is cleaned up.

## Follow-up: consistent headers — November 4, 2026

Signed-in visitors now keep their role header on public content (`/`, `/doctors`, doctor profiles,
and prescription verification). `layouts/WebsiteHeader.tsx` selects the role from authentication;
guests keep the existing public navigation. During session restoration a neutral header placeholder
avoids briefly showing signed-out navigation.

Doctor, patient and admin header files are now thin wrappers around
`shared/navigation/PortalHeader/PortalHeader.tsx`. Role menus and labels live in
`portalHeader.config.ts`, route titles in `pageTitles.ts`, and account controls/clock in small
components. All new files are below 150 lines. Page titles and destinations vary by role, while
the header implementation and styles are shared.

Public pages use Aqua Water in light mode for every role; portal routes restore saved appearance
preferences. The home hero has a light aqua background. Public-page mobile navigation provides
Home, Find a doctor, Verify prescription, and a return link to the user's portal.

`/notifications` redirects by role, including `/patient/notifications`, so a patient-only route
cannot intercept the doctor/admin notification entry. Frontend production build passed and
188 tests passed across 44 files. A real signed-in doctor session was checked on the homepage;
mobile website navigation and Escape dismissal also worked. No backend changes or commits were
made in this header follow-up.

