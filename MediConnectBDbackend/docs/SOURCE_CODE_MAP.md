# MediConnect BD Source Code Map

> Status: living reference  
> Last reviewed: 2026-10-19

## 1. Why this file exists

This map answers three questions for every developer:

1. Where does a behavior live?
2. Which files should change when a feature is added?
3. Where is the real source of truth?

The actual application code remains in `.ts` files. Copying all code into Markdown would create a second, outdated version of the system, so this document records file purpose and execution paths instead. Source files, tests, migrations, and Git history preserve the code itself.

## 2. Repository map

```text
MediConnectBDbackend/
├── src/
│   ├── modules/                Controllers, routes, services, schemas, entities
│   ├── routes/v1.ts            Versioned router
│   ├── middlewares/            Errors, not-found, request IDs
│   ├── utils/                  General helpers
│   ├── database/               Connection, migrations, seeds
│   ├── workers/worker.ts       Separate BullMQ process, same npm package
│   └── shared/index.ts         Backend constants/types
├── tests/                      Automated backend tests
├── docs/                       Architecture, contracts, decisions, runbooks
├── .env                        Private backend settings, ignored by Git
├── .local/                     Preserved Redis installation/data, ignored
├── package.json                Standalone scripts/dependencies; no workspaces
├── package-lock.json           Exact backend dependency resolution
├── tsconfig.json               Complete strict compiler configuration
└── README.md                   Backend entry point and quick start
```

The original long-form blueprint lives in `docs/planning/`. Unused Docker configuration and generated build output were moved out of the active project during cleanup. `npm run build` recreates `dist` output. Preserve `.local` because it contains local Redis executables and data.

## 3. API startup and composition

| File | Responsibility | Change when |
| --- | --- | --- |
| `src/server.ts` | Loads configuration, connects infrastructure, builds concrete repositories/services, starts HTTP, and handles shutdown | Adding a module, infrastructure client, startup task, or shutdown requirement |
| `src/app.ts` | Express middleware, security headers, CORS, body limit, cookies, logging, health mounting, 404, and global error responses | Changing API-wide HTTP behavior |
| `src/routes/v1.ts` | Mounts versioned feature routers and wires authentication middleware | Adding or moving an `/api/v1` route group |
| `src/config/env.ts` | Parses environment variables into typed configuration and rejects unsafe/missing values | Adding any environment setting |
| `src/modules/health/health.routes.ts` | Liveness and dependency-readiness checks | Adding a critical dependency or readiness rule |

Startup dependency direction:

```text
environment + database + Redis
             |
             v
concrete repositories and adapters
             |
             v
services -> controllers -> routers -> routes/v1.ts -> Express app -> HTTP server
```

`server.ts` is the composition root. Business modules must not create global database, Redis, or provider clients by themselves.

## 4. Cross-cutting code

| File | Responsibility |
| --- | --- |
| `src/utils/app-error.ts` | Safe operational error with HTTP status, stable code, message, and optional details |
| `src/modules/auth/auth.middleware.ts` | Validates access tokens, loads current user state, denies suspended users, and enforces roles |
| `src/middlewares/request-id.ts` | Adds or propagates request correlation IDs |

Cross-cutting middleware belongs in `src/middlewares`. Authentication and roles live in `src/modules/auth/auth.middleware.ts`. `error-handler.ts` and `not-found.ts` preserve the existing error contract.

## 5. Database layer

### 5.1 Connection and schema history

| File/path | Responsibility |
| --- | --- |
| `src/database/data-source.ts` | TypeORM configuration, entity registration, and migration registration |
| `src/database/migrations/` | Ordered, reviewable schema changes; production schema is never created by synchronization |
| `src/database/seeds/run-seeds.ts` | Idempotent catalog and synthetic-demo data |

Current migration sequence:

| Migration | Adds |
| --- | --- |
| `1760788800000-initial-foundation.ts` | Users, roles, initial profiles, catalogs, and base relationships |
| `1760875200000-add-auth-sessions.ts` | Refresh-session persistence |
| `1760961600000-add-doctor-directory.ts` | Doctor profile detail, specialties, hospitals, chambers, and review workflow |
| `1761048000000-add-doctor-scheduling.ts` | Weekly schedules, time off, concrete appointment slots |
| `1761134400000-add-appointment-booking.ts` | Slot holds and appointments |
| `1761220800000-add-payments.ts` | Payments, verification events, refund foundation |

Never edit an already-applied migration to change history. Add a new timestamped migration and provide both `up` and safe `down` logic where data preservation permits.

### 5.2 Entity files

| File | Table/domain |
| --- | --- |
| `modules/users/user.entity.ts` | User identity and account status |
| `modules/role/role.entity.ts` | Roles and user-role relationship |
| `modules/auth/refresh-session.entity.ts` | Hashed, rotatable login sessions |
| `modules/patients/patient-profile.entity.ts` | Patient role profile |
| `modules/doctors/doctor-profile.entity.ts` | Doctor identity, professional profile, and application status |
| `modules/specialties/specialty.entity.ts` | Specialty catalog and doctor links |
| `modules/hospitals/hospital.entity.ts` | Hospital/location catalog |
| `modules/doctors/doctor-chamber.entity.ts` | Doctor-to-hospital practice location and fee |
| `modules/appointments/consultation-mode.ts` | Shared `VIDEO`/`CHAMBER` enum |
| `modules/scheduling/doctor-schedule.entity.ts` | Recurring weekly availability rules |
| `modules/scheduling/schedule-time-off.entity.ts` | Doctor full-day/partial-day exceptions |
| `modules/scheduling/appointment-slot.entity.ts` | Concrete generated bookable time window |
| `modules/appointments/slot-hold.entity.ts` | Expiring patient reservation on a slot |
| `modules/appointments/appointment.entity.ts` | Durable patient-doctor booking and its lifecycle |

Entity decorators describe persistence. Business workflows and permission decisions do not belong in entity hooks.

## 6. Authentication module

Path: `src/modules/auth/`

| File | Responsibility |
| --- | --- |
| `auth.routes.ts` | Authentication URL bindings |
| `auth.controller.ts` | Registration/login/refresh/logout handlers and cookie policy |
| `auth.schema.ts` | Zod validation and normalization for credentials and registration |
| `auth.service.ts` | Registration/session workflows, password checks, refresh rotation, logout |
| `auth.repository.ts` | Persistence contract used by the service |
| `typeorm-auth.repository.ts` | TypeORM implementation and transaction details |
| `access-token.service.ts` | Sign and verify short-lived JWT access tokens |
| `password-hasher.ts` | Argon2id password hashing and verification boundary |
| `auth.types.ts` | Module inputs, outputs, session context, and authenticated user views |

Request path:

```text
HTTP request -> auth.routes -> auth.controller -> auth.schema -> auth.service
                                           -> password/JWT adapter
                                           -> auth.repository -> MySQL
```

## 7. Doctor directory module

Path: `src/modules/doctors/`

| File | Responsibility |
| --- | --- |
| `doctor.routes.ts` | Directory/profile/admin/catalog route bindings and scheduling router mount |
| `doctor.controller.ts` | Directory/profile/admin/catalog HTTP handlers |
| `doctor.schema.ts` | Profile, search, pagination, identifiers, and review validation |
| `doctor.service.ts` | Profile completeness, visibility, review transitions, and directory rules |
| `doctor.repository.ts` | Doctor-domain persistence contract |
| `typeorm-doctor.repository.ts` | TypeORM queries, filtering, joins, and transactions |
| `doctor.types.ts` | Public/private profile views, catalog shapes, and query inputs |

The public repository queries must always enforce both approved doctor state and active user state. Hiding these checks only in a client is a security error.

## 8. Scheduling module

Path: `src/modules/scheduling/`

| File | Responsibility |
| --- | --- |
| `scheduling.schema.ts` | Weekly rule, time-off, availability date, and duration validation |
| `scheduling.service.ts` | Ownership, approval, overlap, replacement, time-off, and generation workflows |
| `scheduling.repository.ts` | Persistence and transaction contract |
| `typeorm-scheduling.repository.ts` | TypeORM implementation for rules, exceptions, and slots |
| `slot-generator.ts` | Pure expansion of Dhaka-local recurring rules into UTC slots |
| `scheduling.types.ts` | Rule, time-off, availability, and generated-slot shapes |

Scheduling now has `scheduling.routes.ts` and `scheduling.controller.ts`. The doctor router mounts these beneath `/api/v1/doctors`, preserving all existing URLs.

## 9. Appointment module

Path: `src/modules/appointments/`

| File | Responsibility |
| --- | --- |
| `appointment.routes.ts` | Patient appointment route bindings |
| `appointment.controller.ts` | Hold/release/book/history HTTP handlers |
| `appointment.schema.ts` | Slot and hold UUID validation |
| `appointment.service.ts` | Maps transactional outcomes to stable API behavior/errors |
| `appointment.repository.ts` | Transaction-oriented booking persistence contract |
| `typeorm-appointment.repository.ts` | Row locks, stale-hold expiry, uniqueness, booking, and appointment queries |
| `appointment.types.ts` | Hold/appointment views and explicit repository result unions |

Booking path:

```text
POST /appointments/holds
  -> authenticate + PATIENT role
  -> createHoldSchema
  -> AppointmentService.holdSlot
  -> TypeOrmAppointmentRepository transaction
  -> lock/check slot + expire stale hold + create/reuse hold

POST /appointments
  -> authenticate + PATIENT role
  -> bookAppointmentSchema
  -> AppointmentService.bookAppointment
  -> TypeOrmAppointmentRepository transaction
  -> lock/check owned hold + create/reuse appointment + mark slot booked
```

Concurrency guarantees belong in MySQL constraints and transactions, not only in an in-memory check.

## 10. Worker and shared package

| File | Responsibility |
| --- | --- |
| `src/workers/worker.ts` | Starts BullMQ workers and handles background jobs; will host hold expiry, reminders, callbacks, notifications, scanning, and document jobs |
| `src/shared/index.ts` | Small framework-neutral constants/types shared by API and worker |

Do not move TypeORM entities or Express types into `shared`. Shared code must be safe for both processes and have a clear second consumer.

## 11. Test map

Tests should be colocated by package or kept in its existing test directory convention. Each feature needs:

- schema unit tests for input boundaries;
- service unit tests with repository fakes;
- repository integration tests for constraints and transactions;
- HTTP tests for routes, authentication, roles, status codes, and response bodies;
- concurrency tests for slots, payment callbacks, and other one-winner operations;
- worker tests for retry, idempotency, and terminal failure behavior.

A bug fix must include a test that fails before the fix and passes afterward.

## 12. Documentation map

| Document | Responsibility |
| --- | --- |
| `README.md` | Setup, current milestone, basic run commands, and document index |
| `docs/DEVELOPMENT_CONTROL.md` | Scope, roadmap, status, acceptance gates, risk, and release control |
| `docs/BACKEND_ARCHITECTURE_AND_CODE_STANDARD.md` | Technology choices, dependency rules, coding style, comments, testing, and security |
| `docs/DATABASE_DESIGN_AND_MIGRATIONS.md` | Current/planned data model, constraints, transactions, migrations, and retention |
| `docs/API_AND_BUSINESS_FLOWS.md` | Current/planned HTTP contracts and end-to-end workflows |
| `docs/SOURCE_CODE_MAP.md` | File ownership and change navigation |
| `docs/decision-log.md` | Architecture decisions and their reasons |
| `docs/authentication.md` | Detailed auth examples and error behavior |
| `docs/doctor-directory.md` | Doctor profile, verification, discovery, and catalog details |
| `docs/scheduling.md` | Schedule, time-off, slot generation, and availability details |
| `docs/appointments.md` | Hold and booking details |
| `docs/setup-verification.md` | Local environment verification evidence/checklist |

## 13. Where future features go

Each new module follows the same shape:

```text
src/modules/<feature>/
├── <feature>.routes.ts
├── <feature>.controller.ts
├── <feature>.schema.ts
├── <feature>.entity.ts
├── <feature>.service.ts
├── <feature>.repository.ts
├── typeorm-<feature>.repository.ts
└── <feature>.types.ts
```

Recommended placement:

| Feature | API module | Important infrastructure |
| --- | --- | --- |
| SSLCommerz payment/refund | `modules/payments` (core payment implemented) | Sandbox adapter in `sslcommerz-payment-provider.ts`; worker/refund execution pending |
| Cancellation policy | Extend `appointments` | Transaction with payment/refund/outbox |
| Video consultation | `modules/consultations` | WebRTC/TURN adapter and Socket.IO gateway |
| Appointment messaging | `modules/messages` | Socket.IO gateway plus durable message repository |
| Medical documents | `modules/documents` | S3-compatible storage adapter and scan worker |
| Prescriptions | `modules/prescriptions` | PDF renderer through a port/adapter |
| Notifications | `modules/notifications` | Email/SMS adapters and BullMQ delivery jobs |
| Reviews | `modules/reviews` | Appointment completion eligibility checks |
| Audit | `modules/audit` | Append-only writer and admin read route |

External provider SDKs must stay behind interfaces so services can be tested without network calls.

## 14. Complete change checklist

When adding or changing a backend feature:

1. Confirm its milestone and acceptance rule in `DEVELOPMENT_CONTROL.md`.
2. Record a new architectural choice in `decision-log.md` if needed.
3. Define request/response and business states before implementation.
4. Add or change entities and create a new migration.
5. Add repository interface methods and transactional TypeORM implementation.
6. Implement framework-independent service rules.
7. Add Zod schemas and thin routes with authentication/roles.
8. Add jobs/outbox events for work that must survive process failure.
9. Add tests at the appropriate levels.
10. Update the API, database, source-map, and feature documents.
11. Run typecheck, tests, build, migration validation, and formatting/diff checks.
12. Review logs and responses for secrets or medical-data leakage.

## 15. Code preservation policy

### Payment module added 2026-10-19

`src/modules/payments/` now contains routes, controller, Zod schema, service, repository interface, TypeORM repository, payment types/decimal normalization, provider interface, and sandbox adapter. The same payment module contains `payment.entity.ts`, `payment-event.entity.ts`, and `refund.entity.ts`; migration `1761220800000-add-payments.ts` adds their tables. Five `tests/payment*.test.ts` files cover business decisions, HTTP contracts, provider behavior, and opt-in real MySQL transactions/concurrency. See [payments](./payments.md) for setup and limitations.

- Git is the historical record for every line of source code.
- Do not paste full source-file copies into documentation.
- Do not commit generated build output, local `.env`, database files, or uploaded medical data.
- Use small, reviewed commits when the user later authorizes commits; this documentation task itself does not create a commit.
- A moved or renamed source file requires this map to be updated in the same change.
