# MediConnect BD Backend Development Control

> Document owner: Mehedi Hasan  
> Version: 1.3  
> Last reviewed: 19 October 2026  
> Backend status: Active development  
> Delivery model: Modular monolith  
> Framework decision: Express 5 with TypeScript  
> Data policy: Synthetic development data only

## 1. Purpose

This is the master control document for MediConnect BD backend development. It defines:

- the approved architecture and technologies;
- the current implementation status;
- the order in which modules must be developed;
- acceptance criteria for every milestone;
- quality, security, documentation, and testing gates;
- how database and API changes are controlled;
- how daily progress and technical decisions are recorded.

This document controls backend work. Detailed rules are maintained in:

- [Backend architecture and code standard](./BACKEND_ARCHITECTURE_AND_CODE_STANDARD.md)
- [Database design and migrations](./DATABASE_DESIGN_AND_MIGRATIONS.md)
- [API and business flows](./API_AND_BUSINESS_FLOWS.md)
- [Source code map](./SOURCE_CODE_MAP.md)
- [Decision log](./decision-log.md)

When documents disagree, apply this order:

1. Security and privacy rules in this document.
2. Accepted decisions in `decision-log.md`.
3. Database and API contracts.
4. Architecture and code-style guidance.
5. Older planning notes.

## 2. Product boundary

MediConnect BD is a browser-based healthcare platform for:

- finding approved doctors;
- viewing doctor profiles and upcoming availability;
- booking chamber and video consultations;
- paying for video consultations;
- joining controlled video consultations;
- persistent appointment messaging;
- uploading and reviewing synthetic medical reports;
- creating doctor-authored digital prescriptions;
- operational administration and reporting.

The deadline deliverable is a public demonstration using synthetic identities,
synthetic medical information, and sandbox payments. It is not a certified clinical
production system.

### 2.1 Explicitly excluded from the first delivery

- Real patient or clinical data
- Production payment credentials
- Autonomous diagnosis or medication selection
- Video recording
- Native mobile applications
- Insurance processing
- Medicine delivery
- Laboratory marketplace
- Production compliance claims
- Microservices

## 3. Framework and architecture decision

### 3.1 Approved decision

Continue with **Express 5 and TypeScript**. Do not rewrite the current backend in
NestJS during the delivery period.

Reasons:

- authentication, directory, scheduling, slots, and appointment holds already work;
- current modules already follow route/schema/service/repository boundaries;
- migration would consume time without adding user-facing functionality;
- Express is sufficient for a modular monolith when structure is enforced;
- the team can learn and maintain the current code more quickly.

NestJS may be reconsidered after the demonstration only if team size, organizational
standards, or long-term maintenance requirements justify a controlled migration.

### 3.2 Architectural style

Use one modular TypeScript application with:

- one Express REST API;
- one BullMQ worker process;
- one MySQL database as the transactional source of truth;
- Redis for background-job delivery and temporary coordination;
- Socket.IO for application events;
- LiveKit for audio/video media;
- private S3-compatible object storage for documents;
- SSLCommerz sandbox for payment testing.

Business status must be stored in MySQL. Redis, browser state, payment redirects, and
WebSocket messages are never authoritative for bookings, money, or medical access.

## 4. Roles and permissions

| Role | Main capabilities | Main restrictions |
|---|---|---|
| Visitor | Search approved doctors and view public availability | No booking or private data |
| Patient | Manage own profile, holds, appointments, payments, files, messages, prescriptions | Cannot access another patient's records |
| Doctor | Complete profile, submit verification, manage schedule, conduct assigned appointments | Clinical features require approval and care relationship |
| Admin | Verify doctors, manage catalogs, refunds, and operational reports | No clinical content by default |
| Invited participant | Join one consented appointment room | No automatic record or message-history access |

Every protected operation must check both authentication and resource ownership. A
role check alone is not sufficient for appointment or medical information.

## 5. Current implementation status

Status meanings:

- `DONE`: implemented, migrated, tested, and documented.
- `IN PROGRESS`: active work exists but acceptance criteria are incomplete.
- `PLANNED`: approved for the first delivery but not started.
- `LATER`: deliberately deferred.

| Module | Status | Current result | Remaining work |
|---|---|---|---|
| Repository foundation | DONE | One standalone backend npm package, including API, worker, shared code, docs, settings, and local Redis files | Add a separate frontend folder later |
| Configuration | DONE | Validated environment and private `.env` | Production secret manager later |
| Health checks | DONE | Liveness and MySQL/Redis readiness | Add external dependency readiness carefully |
| Authentication | DONE | Patient/doctor registration, login, refresh rotation, logout | Email verification, reset, rate limit |
| Authorization | DONE | Role middleware and suspended-account denial | Add resource-policy helpers as modules grow |
| Doctor verification | DONE | Profile completion, submission, admin approve/reject | Credential-file upload |
| Public directory | DONE | Search by name, specialty, hospital, area, fee | Ratings and richer sorting |
| Scheduling | DONE | Weekly rules and time off | Worker-driven periodic regeneration |
| Appointment slots | DONE | Seven-day concrete slots in UTC | Booking-window configuration |
| Holds and booking | DONE | Atomic ten-minute holds and double-book protection | Payment confirmation and cancellation policies |
| Payments | IN PROGRESS | Sandbox adapter, initiation, verified callbacks, payment reads/reconciliation, ledger and refund-table foundation | Real sandbox end-to-end evidence, periodic cleanup/reconciliation, admin review/refund actions |
| Notifications | PLANNED | BullMQ worker exists | Email jobs, reminders, retries |
| Video consultations | PLANNED | LiveKit selected | Room grants, tokens, participant policy |
| Messaging | PLANNED | Socket.IO selected | Persistent conversations and authorization |
| Medical documents | PLANNED | Private object storage selected | Upload, scan state, grants, review comments |
| Prescriptions | PLANNED | Doctor-authored workflow defined | Versioning, approval, PDF |
| Reviews | PLANNED | One per completed appointment | Moderation and aggregates |
| Admin reporting | PLANNED | Operational scope defined | Metrics without clinical content |
| Frontend | PLANNED | React stack selected | Implement after stable API contracts |
| Docker/deployment | DEFERRED | Unused configuration moved out during cleanup; local workflow retained | Revisit deployment after core backend completion |

## 6. Milestone control plan

### M0 — Foundation

Status: `DONE`

Deliverables:

- TypeScript strict mode
- Express application and versioned API router
- TypeORM with `synchronize: false`
- MySQL migrations
- Redis connectivity
- BullMQ worker process
- request IDs, structured logs, security headers, CORS
- liveness and readiness routes

Acceptance evidence:

- type-check passes;
- build passes;
- readiness reports database and Redis state;
- no secrets are tracked by Git.

### M1 — Identity and session security

Status: `DONE`

Deliverables:

- patient and doctor registration;
- bcrypt password hashing;
- short-lived JWT access tokens;
- opaque refresh tokens stored only as SHA-256 hashes;
- refresh-token rotation and reuse detection;
- HTTP-only refresh cookie;
- patient, doctor, and admin authorization.

Future hardening:

- email verification;
- forgot-password flow;
- login and registration rate limits;
- user-visible active session management;
- authentication audit events.

### M2 — Doctor verification and directory

Status: `DONE`

Deliverables:

- professional profile fields;
- specialties and hospitals;
- hospital chamber and fee information;
- profile submission;
- admin approval/rejection with reviewer identity;
- approved-doctor-only public directory;
- pagination and filters.

### M3 — Scheduling and availability

Status: `DONE`

Deliverables:

- weekly recurring schedule rules;
- video and chamber modes;
- 10, 15, 20, and 30-minute durations;
- full-day and partial-day time off;
- deterministic seven-day slot generation;
- `Asia/Dhaka` input with UTC persistence;
- one-hour booking lead time;
- stable public availability responses.

### M4 — Holds and appointment creation

Status: `DONE`

Deliverables:

- transactional slot selection;
- pessimistic slot-row locking;
- ten-minute hold expiry;
- repeat request returns the same patient's active hold;
- concurrent different-patient request receives a conflict;
- chamber appointment confirmation;
- video appointment `PENDING_PAYMENT` state;
- patient appointment history;
- release and stale-hold recovery.

### M5 — SSLCommerz sandbox payment

Status: `IN PROGRESS` — core routes, adapter, persistence, state transitions, and automated tests implemented on 2026-10-19. Credentials/public HTTPS callback, real provider evidence, and periodic cleanup/reconciliation remain pending. See [payment implementation](./payments.md).

Required deliverables:

- payment intent and transaction tables;
- server-generated unique transaction identifiers;
- amount and currency snapshots;
- hosted checkout initiation;
- success, failure, cancellation, and IPN endpoints;
- server-to-server payment validation;
- idempotent callback processing;
- atomic payment/appointment/slot state transition;
- failed or expired payment releases the slot;
- synthetic sandbox test evidence.

Acceptance tests:

- browser success parameters alone cannot confirm payment;
- callback amount mismatch is rejected;
- duplicate callbacks do not duplicate state transitions;
- success confirms the appointment exactly once;
- failure leaves no permanent slot lock;
- callbacks for unknown transactions are safely rejected and logged.

### M6 — Notifications and background work

Status: `PLANNED`

Required deliverables:

- outbox table for critical domain events;
- idempotent BullMQ processors;
- booking and payment confirmation email;
- doctor-verification result email;
- reminder jobs for 24 hours and 30 minutes;
- retry policy with bounded backoff;
- failed-job observability;
- development mail transport or test inbox.

### M7 — Consultation access and LiveKit

Status: `PLANNED`

Required deliverables:

- appointment-scoped consultation room;
- patient and doctor participant grants;
- optional consented guest invitation;
- time-window authorization;
- LiveKit access-token endpoint;
- audio/video controls and supported screen share;
- attendance metadata without recording media;
- no token for cancelled, unpaid, unrelated, or expired appointments.

### M8 — Persistent messaging

Status: `PLANNED`

Required deliverables:

- one appointment conversation;
- participant membership;
- persisted messages and read markers;
- REST history with pagination;
- Socket.IO authenticated connection;
- authorization on every room subscription;
- duplicate-message/idempotency handling;
- no medical message body in application logs.

### M9 — Medical documents

Status: `PLANNED`

Required deliverables:

- private file metadata;
- upload intent or signed upload URL;
- allow-listed PDF/JPG/PNG types;
- size limits and scan status;
- explicit owner and care-relationship access;
- doctor review status and comments;
- short-lived signed download URL;
- admin denied from document content by default.

### M10 — Digital prescriptions

Status: `PLANNED`

Required deliverables:

- structured prescription draft;
- medication, strength, dose, frequency, duration;
- tests, advice, and follow-up;
- immutable versions;
- explicit doctor approval;
- PDF generation after approval;
- patient-only and treating-doctor authorization;
- no autonomous medication decisions.

### M11 — Reviews, refunds, and admin reporting

Status: `PLANNED`

Required deliverables:

- one verified review per completed appointment;
- moderation status;
- cancellation preview;
- refund percentage calculation;
- payment/refund audit trail;
- operational metrics for appointments, revenue, users, and doctors;
- no clinical bodies in admin projections.

### M12 — Hardening and demonstration release

Status: `PLANNED`

Required deliverables:

- full authorization regression suite;
- rate limiting;
- input/body/file limits;
- database backup and restore test;
- error and log review for secret leakage;
- dependency audit;
- end-to-end patient/doctor/admin demo;
- Docker and deployment verification;
- HTTPS and production environment validation;
- final README and handoff instructions.

## 7. Work priority rule

Work in this order unless a recorded decision changes it:

1. Data integrity and security
2. P0 patient journey
3. P0 doctor journey
4. P0 admin workflow
5. Failure handling and automated tests
6. Documentation
7. P1 convenience features
8. Visual improvements
9. P2 extensions

Do not begin optional AI, transcription, rich PDF annotation, or recording work while
any P0 state transition lacks tests.

## 8. Daily development workflow

Use this loop for each feature:

1. Read this control file and the relevant detailed document.
2. Define the business state transition and failure cases.
3. Identify authorization and privacy boundaries.
4. Design database constraints and indexes.
5. Write or review the migration.
6. Define request and response types.
7. Add Zod validation.
8. Implement service rules against a repository interface.
9. Implement the TypeORM repository and transaction.
10. Add routes and role/ownership middleware.
11. Add unit and HTTP tests.
12. Apply migrations locally.
13. Perform one live API verification.
14. Run all quality commands.
15. Update documentation and the status table.

Required quality commands:

```bash
npm run typecheck
npm test
npm run build
git diff --check
```

Do not commit or push unless the project owner explicitly requests it.

## 9. Definition of ready

A task is ready to implement when:

- actor and user goal are identified;
- allowed and denied roles are known;
- input, output, and error behavior are defined;
- business states and transitions are listed;
- database ownership is known;
- privacy consequences are considered;
- external dependencies have sandbox credentials or a safe stub;
- acceptance tests are written in plain language.

## 10. Definition of done

A backend task is done only when:

- code follows the approved module layers;
- database changes use an explicit reversible migration;
- authorization is enforced server-side;
- validation rejects malformed and unsafe input;
- critical mutations are transactional;
- duplicate or retried requests are safe where necessary;
- expected failures return structured error codes;
- unit tests pass;
- HTTP or integration tests cover authorization and main failures;
- build and type-check pass;
- no secrets or private medical data are logged;
- relevant Markdown documentation is updated;
- live verification succeeds in the local environment.

## 11. Change control

### 11.1 Changes that require a decision-log entry

- switching framework, ORM, database, queue, video, or payment provider;
- changing appointment, payment, refund, or prescription state machines;
- changing who can access medical information;
- changing the retention or deletion policy;
- adding real patient data;
- enabling video recording;
- adding AI-generated clinical content;
- relaxing authentication or authorization;
- introducing a new service or deployment unit.

### 11.2 Database change control

Before applying a schema change:

- describe why the change is required;
- identify existing-data behavior;
- create `up` and `down` migration paths;
- name foreign keys, unique constraints, and indexes;
- assess locking and migration time;
- confirm entity metadata matches the migration;
- run the migration against the development database;
- rerun seed data to verify idempotency.

Never enable TypeORM schema synchronization.

### 11.3 API change control

Breaking changes require one of:

- a new versioned endpoint;
- a documented compatibility period;
- a coordinated frontend update before release.

Do not silently rename fields, remove error codes, or change state meanings.

## 12. Environment control

### 12.1 Current development environment

- Node.js 24+
- npm 11+
- MySQL on local port `3307`
- Redis on local port `6379`
- API on local port `4000`
- display timezone `Asia/Dhaka`
- database timestamps UTC
- synthetic seeded accounts only

### 12.2 Docker status

Docker work is intentionally deferred while core backend modules are being completed.
Do not redesign business logic around Docker. Containerization must package the same
tested application and migrations without changing domain behavior.

Use [Local development](./LOCAL_DEVELOPMENT.md). The existing private MySQL profile uses port `3307`; the template uses standard local port `3306`. Keep `DB_PORT` aligned with your running server. Use persistent local MySQL storage for valuable manual test data. Docker is not a prerequisite for backend development.

### 12.3 Secret control

- Keep `.env` ignored.
- Never place passwords, JWT secrets, gateway secrets, or private keys in Markdown.
- Use sandbox credentials only during development.
- Rotate any secret exposed in logs, chat, screenshots, or Git.
- Production must use a managed secret mechanism.

## 13. Test-control matrix

| Risk | Required test |
|---|---|
| Password exposure | Public responses never contain password hashes |
| Refresh-token theft | Token is hashed, rotated, and reuse revokes sessions |
| Role bypass | Patient cannot call doctor/admin routes |
| Resource bypass | Patient cannot read another patient's appointment |
| Double booking | Concurrent holds yield one winner |
| Stale hold | Expired hold becomes claimable again |
| Payment forgery | Redirect parameters alone cannot confirm payment |
| Duplicate IPN | Same gateway event changes state once |
| Fee manipulation | Server uses stored fee snapshot |
| Time error | Dhaka schedule produces correct UTC instant |
| Document leakage | Unauthorized and admin download attempts fail |
| Prescription tampering | Approved version is immutable |
| Log leakage | Authorization, cookies, secrets, and medical content are redacted |

## 14. Risk register

| Risk | Likelihood | Impact | Control |
|---|---|---|---|
| Deadline scope is too large | High | High | Finish P0 vertical journey before P1 work |
| Payment callbacks are replayed | High | High | Unique event key and idempotent transaction |
| Two users book one slot | Medium | High | Pessimistic row lock and slot-state check |
| Timezone conversion is wrong | Medium | High | Dhaka input, UTC storage, deterministic tests |
| Medical file becomes public | Medium | Critical | Private bucket and short-lived signed access |
| Admin sees clinical content | Medium | High | Separate metadata projections and policy tests |
| Raw WebRTC delays delivery | High | High | Use managed LiveKit |
| Redis job executes twice | High | Medium | Idempotent processors and outbox keys |
| Temporary local database is lost | Medium | Medium | Repeatable migrations/seeds; persistent setup before handoff |
| Framework rewrite delays project | High | High | Keep Express for this delivery |

## 15. Progress update template

Add a short dated entry after a meaningful milestone:

```text
Date:
Milestone:
Completed:
Database migration:
Endpoints:
Tests added:
Live verification:
Known limitations:
Next action:
```

### 18 October 2026

- Completed API/database foundation and secure authentication.
- Completed doctor verification and public directory.
- Completed weekly scheduling, time off, and seven-day slot generation.
- Completed transactional slot holds and appointment creation.
- Verified concurrent selection returns one winner and one conflict.
- Current automated result: 20 tests across 6 test files.
- Next action: SSLCommerz sandbox payment module.

### 19 October 2026

- Added sandbox payment initiation, private reads, reconciliation, and verified callback endpoints.
- Added payment, deduplicated verification-event, and refund-foundation tables in migration `1761220800000-add-payments.ts`.
- Kept the existing Express/repository architecture and adapted general configuration/token/provider patterns from DokanBD.
- Verified the full migration chain on an isolated temporary MySQL 8.0.46 server; the existing project database was unavailable and was not changed.
- Verified concurrent initiation, duplicate callbacks, rollback, late success, risk handling, and ownership boundaries.
- Automated result: 60 tests across 11 files with the disposable MySQL suite enabled; typecheck and build passed.
- Outstanding: MySQL 8.4 target verification, real SSLCommerz sandbox checkout credentials/public HTTPS callback, periodic reconciliation/cleanup, admin review/refund execution, and rate limiting.
- Next action: configure the sandbox account and verify the complete hosted checkout/IPN flow.

## 16. Release gate

Standalone backend update (19 October 2026): consolidated all backend assets into `MediConnectBDbackend`. Worker code is in `src/workers`, shared constants in `src/shared`, documentation in `docs`, and private `.env`/local Redis files are inside the backend. This package owns its dependencies, lockfile, scripts, and full TypeScript configuration; parent workspaces and separate worker/shared packages were removed. The outer folder retains the existing Git repository and a short README for adding a sibling frontend later. No commits or pushes were made.

Cleanup update (19 October 2026): moved unused Docker configuration and generated API/worker/shared `dist` output to a recoverable folder outside the project. Removed empty root `tests` and `mysql-run` directories. Moved the original long-form blueprint into `docs/planning/`. Source code, tests under the backend, private `.env`, installed dependencies, and `.local` Redis executables/data were retained. Recreate build output with `npm run build` when needed.

Comment handover update (19 October 2026): reviewed and documented 80 implemented backend/worker/shared source files and 59 important functions/methods. Added explanations for ownership, state transitions, concurrency, time conversion, token handling, callback verification, migrations, and remaining worker/refund scope. Confirmed executable code tokens were unchanged by the comment-only pass.

### Layout update — 19 October 2026

- Reorganized the backend under `MediConnectBDbackend` to match the familiar DokanBDbackend project.
- Added controllers, module-owned entities, singular `.schema.ts` files, `src/routes/v1.ts`, `src/middlewares`, `src/utils`, and `tests`.
- Scheduling HTTP handlers now have their own module. Existing URL paths and database table names remain unchanged.
- Moved the worker to the root `worker` folder and refreshed workspace links and lockfile. The private `.env` stays at the project root.
- Added backend `README.md`, `CODE-MAP.md`, and `CHANGE-GUIDE.md`.
- All 77 tests passed, including real MySQL transaction/concurrency checks and 17 new route/controller wiring cases. Typecheck and build passed.
- Docker remains deferred. Local MySQL/Redis startup and real sandbox provider verification are still pending.

The demonstration cannot be called ready until all items below are true:

- [ ] Visitor can find an approved doctor.
- [ ] Patient can register and authenticate.
- [ ] Patient can select a valid slot.
- [ ] Concurrent booking protection is verified.
- [ ] Video payment is verified by the server.
- [ ] Confirmation and reminder notifications work.
- [ ] Patient and doctor can join the authorized LiveKit room.
- [ ] Appointment messages survive refresh.
- [ ] Synthetic medical document upload and controlled review work.
- [ ] Doctor approves a structured prescription and patient downloads the PDF.
- [ ] Admin can verify a doctor and see nonclinical operational metrics.
- [ ] Cancellation and refund rules have automated boundary tests.
- [ ] Full test, type-check, build, migration, seed, and live demo checks pass.
- [ ] No real patient data or production credentials are present.
- [ ] Deployment and restore instructions are verified.

## 17. Immediate next action

Finish M5 by verifying the sandbox checkout with a public HTTPS callback and adding periodic reconciliation/cleanup. The payment module now has transaction, verified-event, refund-table, and payment-state definitions with idempotency keys and
database constraints.
