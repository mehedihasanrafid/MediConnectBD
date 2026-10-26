# MediConnect BD Module Map

This document describes the project structure and the purpose of each major module and file in the repository.

## Project layout

```text
MediConnectBD/
├── README.md
├── MODULE_MAP.md
├── DEVELOPMENT.md
├── MediConnectBDbackend/          # Express + TypeORM backend
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── routes/
│   │   ├── config/
│   │   ├── database/
│   │   ├── docs/
│   │   ├── middlewares/
│   │   ├── modules/
│   │   ├── shared/
│   │   ├── utils/
│   │   └── workers/
│   ├── tests/
│   ├── docs/
│   ├── package.json
│   └── README.md
└── frontend/                      # React + Vite frontend
    ├── src/
    ├── public/
    ├── package.json
    └── README.md
```

---

## Backend runtime entry points

### `MediConnectBDbackend/src/server.ts`
Purpose: application bootstrap. Connects MySQL and Redis, wires all service dependencies, creates the Express app, and starts the HTTP server.

### `MediConnectBDbackend/src/app.ts`
Purpose: builds the Express application shell, attaches middleware, health routes, docs routes, and the versioned API router.

### `MediConnectBDbackend/src/routes/v1.ts`
Purpose: mounts all feature routers under `/api/v1`, including auth, doctors, appointments, payments, reviews, prescriptions, users, and admin endpoints.

### `MediConnectBDbackend/src/config/env.ts`
Purpose: validates environment variables used by the backend, including database, Redis, JWT, and payment configuration.

---

## Shared infrastructure

### `MediConnectBDbackend/src/utils/app-error.ts`
Purpose: central error type for clean API error responses with stable codes.

### `MediConnectBDbackend/src/middlewares/request-id.ts`
Purpose: attaches a request ID for observability and debugging.

### `MediConnectBDbackend/src/middlewares/error-handler.ts`
Purpose: converts thrown application errors into structured HTTP responses.

### `MediConnectBDbackend/src/middlewares/not-found.ts`
Purpose: handles unknown routes with a 404 response.

### `MediConnectBDbackend/src/shared/index.ts`
Purpose: shared constants and common backend values used across modules.

### `MediConnectBDbackend/src/docs/openapi.ts`
Purpose: defines the OpenAPI document structure.

### `MediConnectBDbackend/src/docs/openapi.schemas.ts`
Purpose: defines schema objects used in the API spec.

### `MediConnectBDbackend/src/docs/openapi.routes.ts`
Purpose: serves Swagger UI and OpenAPI JSON endpoints.

---

## Database and migrations

### `MediConnectBDbackend/src/database/data-source.ts`
Purpose: TypeORM data source configuration for MySQL.

### `MediConnectBDbackend/src/database/migrations/`
Purpose: versioned database migrations tracking schema changes and feature additions.

Files include:
- `1760788800000-initial-foundation.ts` — base schema foundation
- `1760875200000-add-auth-sessions.ts` — auth/session tables
- `1760961600000-add-doctor-directory.ts` — doctor and catalog tables
- `1761048000000-add-doctor-scheduling.ts` — schedules and availability
- `1761134400000-add-appointment-booking.ts` — appointment booking tables
- `1761220800000-add-payments.ts` — payments and payment events
- `1761307200000-add-hold-expiry-index.ts` — indexes for unpaid hold expiry
- `1761393600000-add-family-members.ts` — family-member support
- `1761480000000-add-payment-commission.ts` — commission/payment tracking
- `1761500000000-add-reminder-columns.ts` — reminder support
- `1761520000000-add-reviews.ts` — review tables
- `1761540000000-add-prescriptions.ts` — prescription tables

### `MediConnectBDbackend/src/database/seeds/run-seeds.ts`
Purpose: optional database seeding for catalogs and sample/demo data.

---

## Auth module

Path: `MediConnectBDbackend/src/modules/auth/`

```text
auth/
├── access-token.service.ts       # issues and validates signed access JWTs
├── auth.controller.ts            # login/register/refresh/logout HTTP handlers
├── auth.middleware.ts            # JWT validation and role enforcement
├── auth.repository.ts            # repository interface for auth logic
├── auth.routes.ts                # /api/v1/auth route bindings
├── auth.schema.ts                # Zod validation for auth inputs
├── auth.service.ts               # user registration, login, refresh rotation, logout
├── auth.types.ts                 # auth request/response models
├── password-hasher.ts            # password hashing and verification abstraction
├── refresh-session.entity.ts     # refresh-token session entity
├── typeorm-auth.repository.ts    # MySQL-backed repository implementation
└── user-profile logic is split into separate modules and domain entities
```

Purpose:
- Creates patient and doctor accounts
- Manages refresh tokens securely
- Protects endpoints with authenticated middleware
- Enforces role-based access (PATIENT, DOCTOR, ADMIN)

---

## User module

Path: `MediConnectBDbackend/src/modules/users/`

```text
users/
├── user.controller.ts            # returns current authenticated user summary
├── user.entity.ts                # base user entity
├── user.routes.ts                # /api/v1/me-like user endpoints
└── user.*
```

Purpose:
- Returns the authenticated user’s profile state
- Acts as the account/profile read layer
- Keeps password/hash data out of API responses

---

## Doctor module

Path: `MediConnectBDbackend/src/modules/doctors/`

```text
doctors/
├── doctor.controller.ts          # doctor profile and public/search endpoints
├── doctor.profile.entity.ts      # doctor-specific profile data
├── doctor-chamber.entity.ts      # doctor chamber/clinic info
├── doctor.repository.ts          # profile repository interface
├── doctor.routes.ts              # public and protected doctor routes
├── doctor.schema.ts              # validation for doctor input
├── doctor.service.ts             # approval workflow and profile logic
├── doctor.types.ts               # doctor DTOs and query models
├── doctor.entity.ts              # if present in project conventions; otherwise mapped by profile entity
├── typeorm-doctor.repository.ts # MySQL implementation of doctor queries
└── doctor-profile.entity.ts      # actual doctor application entity
```

Purpose:
- Tracks doctor profile completeness
- Handles application submission and review
- Exposes public doctor listings and detail pages
- Lists specialties and hospitals for the catalog

Important business states:
- DRAFT
- PENDING_REVIEW
- REJECTED
- APPROVED

---

## Scheduling module

Path: `MediConnectBDbackend/src/modules/scheduling/`

```text
scheduling/
├── appointment-slot.entity.ts   # generated appointment availability rows
├── doctor-schedule.entity.ts    # weekly doctor availability rules
├── schedule-time-off.entity.ts   # doctor time-off entries
├── scheduling.controller.ts     # schedule and availability controllers
├── scheduling.repository.ts     # schedule repository interface
├── scheduling.routes.ts         # /doctors/:id/schedule routes and availability routes
├── scheduling.schema.ts         # validation for schedule rules and time-off
├── scheduling.service.ts        # business rules for rules, time-off, and slot generation
├── scheduling.types.ts          # DTOs and query types
├── slot-generator.ts            # generates available slots from rules and time-off
├── typeorm-scheduling.repository.ts # MySQL-backed scheduling implementation
└── slot-generator logic supports Dhaka timezone constraints
```

Purpose:
- Stores recurring doctor schedules
- Creates open appointment slots
- Marks unavailable time windows and holidays
- Enforces 1-hour lead-time and no-overlap rules

---

## Appointment module

Path: `MediConnectBDbackend/src/modules/appointments/`

```text
appointments/
├── appointment.controller.ts    # hold/book/cancel/list endpoints
├── appointment.entity.ts        # appointment booking entity
├── appointment.repository.ts    # appointment repository interface
├── appointment.routes.ts        # appointment routes under /appointments
├── appointment.schema.ts        # validation for booking and cancellation
├── appointment.service.ts       # business rules for slot holds, booking, and cancellation
├── appointment.types.ts         # appointment data models
├── cancellation-policy.ts       # cancellation/refund policy logic
├── consultation-mode.ts         # video/chamber mode enum or constants
├── slot-hold.entity.ts          # temporary appointment hold record
├── typeorm-appointment.repository.ts # MySQL-backed implementation
└── hold and booking logic is central to patient flow
```

Purpose:
- Holds patient-selected slots for a short time
- Converts a hold into a confirmed or pending-payment appointment
- Supports cancellation and patient booking history

Key rules:
- 10-minute hold expiration
- 1-hour minimum booking lead time
- booking must be done by the patient who holds the slot

---

## Payment module

Path: `MediConnectBDbackend/src/modules/payments/`

```text
payments/
├── payment.controller.ts        # init, callback, reconcile, and status endpoints
├── payment.entity.ts            # stored payment record
├── payment-event.entity.ts      # provider transaction events and status mutation history
├── payment-provider.ts          # abstraction for payment gateway provider
├── payment.repository.ts        # payment interface
├── payment.routes.ts            # /payments routes
├── payment.schema.ts            # request validation
├── payment.service.ts           # checkout initiation, verification, expiry handling
├── payment.types.ts             # DTOs and payment status types
├── refund.entity.ts             # refund record foundation
├── sslcommerz-payment-provider.ts # SSLCommerz gateway integration
├── typeorm-payment.repository.ts # MySQL-backed implementation
└── provider verification logic prevents fake callback acceptance
```

Purpose:
- Initiates external payment sessions for video/paid appointments
- Verifies real provider responses
- Matches exact transaction amount and order values
- Tracks reconciliation and unpaid-hold expiry

---

## Patient/family module

Path: `MediConnectBDbackend/src/modules/patients/`

```text
patients/
├── family-member.controller.ts  # patient family member endpoints
├── family-member.entity.ts      # family member record
├── family-member.repository.ts  # repository interface
├── family-member.routes.ts      # /patients/me/family-members routes
├── family-member.schema.ts      # request validation
├── family-member.service.ts     # family management logic
├── patient-profile.entity.ts     # patient profile entity
├── typeorm-family-member.repository.ts # MySQL-backed implementation
└── supports patient depedency handling and linked family records
```

Purpose:
- Stores and manages family members linked to a patient
- Supports dependent family health/patient workflows

---

## Reviews module

Path: `MediConnectBDbackend/src/modules/reviews/`

```text
reviews/
├── review.controller.ts        # create/list/delete review endpoints
├── review.entity.ts            # review record
├── review.repository.ts        # interface
├── review.routes.ts            # /reviews routes
├── review.service.ts           # validation and business rules
├── review.types.ts             # review input/output models
├── typeorm-review.repository.ts # MySQL-backed implementation
└── patient feedback on completed appointments
```

Purpose:
- Allows patients to leave ratings after appointments
- Supports review retrieval by doctor or patient

---

## Prescriptions module

Path: `MediConnectBDbackend/src/modules/prescriptions/`

```text
prescriptions/
├── prescription.controller.ts      # create/update/delete/list prescription endpoints
├── prescription.entity.ts          # prescription record
├── prescription.repository.ts      # repository interface
├── prescription.routes.ts          # /prescriptions routes
├── prescription.service.ts         # validation and 24h edit rules
├── prescription.types.ts           # DTOs and status models
├── typeorm-prescription.repository.ts # MySQL-backed implementation
└── doctor-issued treatment records after completed appointments
```

Purpose:
- Records doctor-issued prescriptions
- Enforces doctor ownership and time-bound edit rules
- Supports verification through a code or lookup flow

---

## Admin module

Path: `MediConnectBDbackend/src/modules/admin/`

```text
admin/
├── admin.controller.ts        # admin dashboard and operations endpoints
├── admin.repository.ts        # repository interface
├── admin.routes.ts            # /admin routes
├── admin.schema.ts            # validation for admin actions
├── admin.service.ts           # business rules for admin actions
├── admin.types.ts             # admin query and payload types
├── typeorm-admin.repository.ts # MySQL-backed implementation
└── platform administration and catalog management
```

Purpose:
- Reviews and approves doctor applications
- Manages hospital and specialty catalogs
- Lists appointment and payment data
- Manages refund submission and user status changes

---

## Notifications module

Path: `MediConnectBDbackend/src/modules/notifications/`

```text
notifications/
├── console-transport.ts       # logs notifications locally for dev/testing
├── email-service.ts           # email abstraction and send orchestration
├── email.types.ts             # email payload definitions
├── notification-service.ts    # sends notifications for appointments and reminders
├── reminder-scheduler.ts      # reminder scheduling logic
├── reminder.types.ts          # reminder data interfaces
├── smtp-transport.ts          # SMTP implementation for real email delivery
├── typeorm-reminder.repository.ts # MySQL reminder storage
└── sends confirmation, reminder, and operational notifications
```

Purpose:
- Sends appointment confirmations and reminders
- Supports local console transport and real SMTP
- Provides infrastructure for future notification workflows

---

## Hospitals and catalog entities

### `MediConnectBDbackend/src/modules/hospitals/hospital.entity.ts`
Purpose: hospital catalog entity used by doctor profiles and doctor search.

### `MediConnectBDbackend/src/modules/specialties/specialty.entity.ts`
Purpose: specialty catalog entity used for doctor classifications.

### `MediConnectBDbackend/src/modules/role/role.entity.ts`
Purpose: role definitions used by user authorization and access-control checks.

---

## Health module

Path: `MediConnectBDbackend/src/modules/health/`

```text
health/
├── health.controller.ts
├── health.routes.ts
└── readiness and liveness checks
```

Purpose:
- Provides `/health` or readiness endpoints
- Verifies DB and Redis availability before accepting traffic

---

## Workers

### `MediConnectBDbackend/src/workers/worker.ts`
Purpose: background worker entry point.

### `MediConnectBDbackend/src/workers/system-jobs.ts`
Purpose: schedules recurring system tasks such as hold expiry and reminder processing.

### `MediConnectBDbackend/src/workers/reminder-worker.ts`
Purpose: worker logic for notifications/reminders if enabled.

Purpose:
- Runs background jobs independently from the main API process
- Expire unpaid holds and process recurring automation

---

## Frontend module

Path: `frontend/src/`

```text
frontend/src/
├── App.tsx                    # app shell, navigation, protected routes
├── main.tsx                   # app bootstrap
├── index.css                  # global styling
├── components/                # reused UI building blocks
├── features/
│   ├── auth/
│   │   ├── AuthContext.tsx
│   │   ├── LoginPage.tsx
│   │   └── ...
│   ├── doctors/
│   │   ├── DoctorSearchPage.tsx
│   │   ├── DoctorDetailPage.tsx
│   │   └── ...
│   ├── appointments/
│   │   ├── AppointmentsPage.tsx
│   │   └── ...
│   ├── doctor/
│   │   ├── DoctorDashboardPage.tsx
│   │   └── ...
│   ├── admin/
│   │   ├── AdminApplicationsPage.tsx
│   │   └── ...
│   └── patient/
│       ├── FamilyMembersPage.tsx
│       └── ...
├── shared/                    # shared frontend utilities and types
└── common UI/layout logic and route guards
```

Purpose:
- Renders the web app
- Uses role-based access guards for PATIENT, DOCTOR, and ADMIN users
- integrates with the backend API for search, scheduling, booking, payments, and admin management

---

## Architectural pattern used throughout the backend

The app follows a clear layered design:

```text
HTTP route
  -> controller
  -> schema validation
  -> service
  -> repository interface
  -> TypeORM repository
  -> MySQL entity
```

This makes each feature modular and easier to test, and it keeps SQL/data access concerns separate from business rules.

---

## Most important files to know first

If you are new to the codebase, start with these files:

1. `MediConnectBDbackend/src/server.ts` — composition root
2. `MediConnectBDbackend/src/routes/v1.ts` — feature router map
3. `MediConnectBDbackend/src/modules/auth/auth.service.ts` — login/registration/session rules
4. `MediConnectBDbackend/src/modules/doctors/doctor.service.ts` — doctor profile approval flow
5. `MediConnectBDbackend/src/modules/scheduling/scheduling.service.ts` — availability logic
6. `MediConnectBDbackend/src/modules/appointments/appointment.service.ts` — booking flow rules
7. `MediConnectBDbackend/src/modules/payments/payment.service.ts` — payment verification logic
8. `frontend/src/App.tsx` — app routing and auth guard setup

This summary should help you navigate the repo quickly while understanding which module owns which part of the platform.
