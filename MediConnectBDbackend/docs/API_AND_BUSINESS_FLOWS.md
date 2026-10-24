# MediConnect BD API and Business Flows

> Status: living reference  
> Last reviewed: 2026-10-18  
> API base path: `/api/v1`  
> Business timezone: `Asia/Dhaka`; timestamps stored and returned in UTC

## 1. Purpose

This document explains how the backend is used from a client application and how the major healthcare workflows move through the system. It records both the routes that exist today and the routes planned for later milestones.

The TypeScript source is always the executable source of truth. When a route, validation rule, permission, response, or business state changes, update this document in the same change.

## 2. API-wide rules

### 2.1 Transport and data format

- Use HTTPS outside local development.
- Requests and responses use JSON unless a file-upload endpoint explicitly uses multipart form data.
- Protected routes use `Authorization: Bearer <access-token>`.
- The refresh token is held in the `mediconnect_refresh` HTTP-only cookie and is limited to `/api/v1/auth`.
- IDs are UUID strings. Clients must treat them as opaque values.
- Date-time values use ISO 8601 UTC, for example `2026-10-18T08:30:00.000Z`.
- Calendar dates use `YYYY-MM-DD`.
- Weekly schedule times use 24-hour `HH:mm`; the backend normalizes them to `HH:mm:ss`.
- Money is represented as a decimal amount in BDT. Financial calculations must use fixed-point/decimal database values, never JavaScript floating-point arithmetic for settlement logic.

### 2.2 Success responses

- Create operations normally return `201 Created`.
- Read and update operations normally return `200 OK`.
- Successful deletion or logout returns `204 No Content`.
- Collection responses use `items`; paginated collections also include `page`, `limit`, `total`, and `totalPages`.
- A retry-safe operation may return the resource created by the first request instead of creating a duplicate.

### 2.3 Error responses

Business errors use a stable machine-readable code:

```json
{
  "code": "SLOT_UNAVAILABLE",
  "message": "The selected appointment slot is no longer available"
}
```

Validation errors return `422`:

```json
{
  "code": "VALIDATION_FAILED",
  "message": "The request data is invalid",
  "fieldErrors": [
    { "path": "email", "message": "Invalid email" }
  ]
}
```

Expected HTTP meanings:

| Status | Meaning |
| --- | --- |
| `400` | Malformed request or impossible operation |
| `401` | No valid authenticated session |
| `403` | Authenticated but not allowed |
| `404` | Resource not found or not visible to this caller |
| `409` | State conflict, duplicate, or concurrent booking conflict |
| `422` | Input validation failed |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error; internal details are not exposed |
| `503` | A required dependency is unavailable |

### 2.4 Pagination and filtering

- `page` is one-based.
- `limit` has an endpoint-specific safe maximum.
- Filters are combined with AND unless explicitly documented otherwise.
- Search input is trimmed and normalized by the API.
- Stable sort order must be defined before cursor pagination is introduced.

### 2.5 Idempotency

Booking currently achieves retry safety through a unique hold-to-appointment relationship. Payment and other externally retried commands must additionally accept an `Idempotency-Key` header and persist its result. The same key and same payload must return the original result; the same key with a different payload must fail with `409`.

### 2.6 Versioning

- Backward-compatible fields may be added inside `/api/v1`.
- Removing or changing an existing field requires a new API version or a documented deprecation period.
- Internal refactoring must not silently change the public contract.

## 3. Access matrix

| Capability | Public | Patient | Doctor | Admin |
| --- | :---: | :---: | :---: | :---: |
| View health and public catalogs | Yes | Yes | Yes | Yes |
| Search approved doctors | Yes | Yes | Yes | Yes |
| Register/login | Yes | Yes | Yes | Yes |
| Manage own doctor profile and schedule | No | No | Yes | No |
| Review doctor applications | No | No | No | Yes |
| Hold a slot and book own appointment | No | Yes | No | No |
| View own appointments | No | Yes | Planned | Operational only |
| Enter a consultation room | No | Booked patient | Assigned doctor | No clinical access |
| Write a prescription | No | No | Assigned doctor | No |
| Read a prescription | No | Owning patient | Issuing doctor | No clinical access |
| Process payment/refund operations | No | Own payment | No | Authorized operational role |

Admin access is for platform operations. It must not automatically grant access to private clinical notes, consultation messages, or prescription content.

## 4. Implemented routes

### 4.1 Platform and health

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | Public | API name, version, and API root hint |
| `GET` | `/health/live` | Public | Confirms that the process is running |
| `GET` | `/health/ready` | Public | Confirms MySQL and Redis are reachable |

Health routes must reveal status, not credentials, connection strings, or stack traces.

### 4.2 Authentication

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/patient/register` | Public | Create a patient account and session |
| `POST` | `/api/v1/auth/doctor/register` | Public | Create a doctor account and draft doctor profile |
| `POST` | `/api/v1/auth/login` | Public | Verify credentials and create a session |
| `POST` | `/api/v1/auth/refresh` | Refresh cookie | Rotate the refresh session and issue a new access token |
| `POST` | `/api/v1/auth/logout` | Optional refresh cookie | Revoke the refresh session and clear the cookie |
| `GET` | `/api/v1/me` | Bearer token | Return the current user, roles, and profile identifiers |

Patient registration body:

```json
{
  "email": "patient@example.com",
  "password": "StrongPassword123",
  "firstName": "Amina",
  "lastName": "Rahman",
  "phone": "+8801700000000"
}
```

Doctor registration uses the same required identity fields and replaces optional `phone` with required `bmdcNumber`. Registration passwords are 12–128 characters and must contain lowercase, uppercase, and a number. Email is normalized to lowercase; BMDC number is normalized to uppercase.

Successful registration and login return an access token and public user summary. The raw refresh token never appears in the JSON body.

### 4.3 Public catalogs and doctor discovery

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/catalog/specialties` | Public | List active medical specialties |
| `GET` | `/api/v1/catalog/hospitals` | Public | List catalog hospitals and locations |
| `GET` | `/api/v1/doctors` | Public | Search approved, active doctors |
| `GET` | `/api/v1/doctors/:doctorId` | Public | View one approved doctor's public profile |
| `GET` | `/api/v1/doctors/:doctorId/availability` | Public | View bookable slots for up to seven days |

Doctor search query:

| Parameter | Meaning | Default/limit |
| --- | --- | --- |
| `search` | Doctor name or supported text search | Optional, max 120 characters |
| `specialty` | Specialty name or slug | Optional |
| `hospital` | Hospital name or slug | Optional |
| `area` | Hospital area | Optional |
| `minFee` / `maxFee` | Fee range in BDT | Optional; minimum cannot exceed maximum |
| `page` | Page number | Default `1` |
| `limit` | Results per page | Default `12`, maximum `50` |

Availability query accepts optional `from=YYYY-MM-DD` and `days=1..7` (default `7`). Only future, active, unbooked slots meeting the one-hour lead-time rule are returned.

### 4.4 Doctor self-service

All routes require a valid bearer token and the `DOCTOR` role.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/doctors/me` | Read the doctor's complete private profile |
| `PATCH` | `/api/v1/doctors/me` | Update profile, specialties, languages, fees, and chambers |
| `POST` | `/api/v1/doctors/me/submit` | Submit a complete application for admin review |
| `GET` | `/api/v1/doctors/me/schedule` | Read weekly rules and time off |
| `PUT` | `/api/v1/doctors/me/schedule` | Replace all weekly schedule rules atomically |
| `POST` | `/api/v1/doctors/me/time-off` | Add full-day or partial-day time off |
| `DELETE` | `/api/v1/doctors/me/time-off/:timeOffId` | Remove owned time off |
| `POST` | `/api/v1/doctors/me/slots/generate` | Regenerate the rolling seven-day slot window |

The profile patch accepts only supplied fields. Important limits are ten languages, ten specialties, twenty chambers, and fees from 0 to 1,000,000 BDT.

Schedule replacement example:

```json
{
  "rules": [
    {
      "dayOfWeek": 1,
      "startTime": "18:00",
      "endTime": "20:00",
      "slotDurationMinutes": 20,
      "mode": "VIDEO"
    },
    {
      "dayOfWeek": 3,
      "startTime": "17:00",
      "endTime": "19:00",
      "slotDurationMinutes": 30,
      "mode": "CHAMBER",
      "chamberId": "00000000-0000-4000-8000-000000000000"
    }
  ]
}
```

`dayOfWeek` uses `0` for Sunday through `6` for Saturday. Durations are limited to 10, 15, 20, or 30 minutes. A video rule cannot reference a chamber; a chamber rule must reference a chamber owned by the doctor.

Time-off body:

```json
{
  "date": "2026-10-25",
  "startTime": "14:00",
  "endTime": "17:00",
  "reason": "Conference"
}
```

Omit both times for a full day. Supplying only one time is invalid.

### 4.5 Doctor verification administration

All routes require a bearer token and the `ADMIN` role.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/admin/doctors/applications` | List applications by review state |
| `PATCH` | `/api/v1/admin/doctors/:doctorId/application` | Approve or reject an application |

List query defaults to `PENDING_REVIEW`, page `1`, limit `20`, with a maximum limit of `50`.

Approval body:

```json
{ "decision": "APPROVED" }
```

Rejection body:

```json
{
  "decision": "REJECTED",
  "reason": "The submitted registration information could not be verified."
}
```

The backend records the reviewer and review time. Only approved doctors appear publicly or create active schedules.

### 4.6 Patient appointment booking

All routes require a bearer token, the `PATIENT` role, and a patient profile.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/appointments/holds` | Lock an available slot for ten minutes |
| `DELETE` | `/api/v1/appointments/holds/:holdId` | Release the patient's active hold |
| `POST` | `/api/v1/appointments` | Convert the patient's active hold into an appointment |
| `GET` | `/api/v1/appointments/me` | List the patient's appointments |

Hold body:

```json
{ "slotId": "00000000-0000-4000-8000-000000000000" }
```

Booking body:

```json
{ "holdId": "00000000-0000-4000-8000-000000000000" }
```

The server derives the patient from authentication; the client cannot choose another patient ID. Concurrent requests cannot reserve or book the same slot twice. Reusing a successfully booked hold returns the original appointment.

## 5. Core business flows

### 5.1 Patient registration and session

1. Client validates basic input for usability; the server validates again for security.
2. API normalizes email and hashes the password with bcrypt.
3. A database transaction creates the user, role mapping, and patient profile.
4. API creates a hashed refresh session, sets the secure cookie, and returns a short-lived access token.
5. On access-token expiry, the client calls refresh; the old refresh token is revoked and replaced.
6. Logout revokes the current refresh session.

### 5.2 Doctor onboarding and approval

1. Doctor registers with a unique email and BMDC number.
2. Doctor completes qualifications, experience, specialties, languages, fees, and chambers.
3. The submit action checks all mandatory information and changes the application to `PENDING_REVIEW`.
4. Admin verifies evidence outside the public doctor interface.
5. Admin approves or rejects with an auditable reviewer and timestamp.
6. Approval enables public discovery and scheduling; rejection keeps the doctor private and includes a correction reason.

### 5.3 Schedule and slot generation

1. An approved doctor defines recurring weekly rules in Dhaka local time.
2. The backend rejects overlaps and invalid chamber ownership.
3. The generator expands rules into concrete UTC slots for the next seven days.
4. Full-day or partial-day time off removes/conflicts with generated availability.
5. Existing booked appointments are never silently deleted when schedules change.
6. Public availability excludes held, booked, too-soon, expired, inactive, or time-off slots.

### 5.4 Appointment booking

1. Patient searches doctors and fetches availability.
2. Patient requests a hold on one slot.
3. A transaction locks the slot, checks lead time and availability, expires stale holds, and creates one ten-minute hold.
4. For a chamber visit, booking immediately creates a confirmed appointment.
5. For a video visit, booking creates a payment-pending appointment.
6. The unique slot and hold constraints make the result safe under retries and concurrency.
7. A background job will expire abandoned holds and return their slots to availability.

### 5.5 Planned video payment flow

1. Patient books a video appointment from an active hold.
2. Backend creates a local `payment` in `INITIATED` state and calls SSLCommerz sandbox using a server-generated transaction ID.
3. Client is redirected to the payment page; the browser return URL is informational only.
4. SSLCommerz sends a server callback/IPN.
5. Backend verifies the callback with the provider, locks the payment and appointment rows, and applies the event once.
6. Valid success changes payment to `SUCCEEDED` and appointment to `CONFIRMED`.
7. Failure or timeout changes payment to a terminal failure state, cancels the appointment, and releases the slot.
8. Every callback payload and state change is kept in an immutable payment event record with sensitive values redacted.

Never confirm an appointment from only a client redirect. Provider verification and matching amount, currency, transaction, and appointment are mandatory.

### 5.6 Planned consultation flow

1. A confirmed video appointment receives a consultation room shortly before start time.
2. Backend creates short-lived, participant-specific room tokens for only the assigned doctor and patient.
3. Both participants may join only inside the permitted time window.
4. Connection lifecycle is recorded without storing media unless explicit policy and consent permit it.
5. Doctor completes the encounter or records a no-show.
6. Appointment and consultation status changes are auditable.

### 5.7 Planned document and prescription flow

1. Patient requests a signed upload URL for an allowed file type and size.
2. Object storage receives the encrypted file under a non-public key.
3. Backend records metadata and queues malware scanning.
4. Only the owning patient and assigned doctor receive short-lived download access.
5. During/after a consultation, the assigned doctor builds a structured draft prescription.
6. Finalization creates an immutable prescription version and a generated PDF; edits create a new version rather than rewriting history.
7. Patient can read/download the finalized prescription. Admin has no default clinical-document access.

### 5.8 Planned cancellation and refund flow

1. Caller requests cancellation with a reason.
2. Backend evaluates actor, current state, start time, and configured cancellation policy.
3. One transaction changes appointment state and creates a refund request when eligible.
4. Provider refund is executed asynchronously and reconciled through verified provider results.
5. Slot release follows policy; historical appointment and payment records remain.

## 6. State machines

State names must be explicit enums, and changes must go through services rather than arbitrary repository updates.

### 6.1 Doctor application

```text
DRAFT -> PENDING_REVIEW -> APPROVED
                        -> REJECTED -> DRAFT (after correction/resubmission policy)
```

### 6.2 Slot hold

```text
ACTIVE -> CONVERTED
       -> RELEASED
       -> EXPIRED
```

### 6.3 Appointment

```text
VIDEO:   PENDING_PAYMENT -> CONFIRMED
                        -> CANCELLED
                        -> PAYMENT_EXPIRED
CHAMBER: CONFIRMED
Existing enum values also reserve COMPLETED and NO_SHOW for future lifecycle APIs.
```

Exact enum values already present in the source must be preserved when extending the state machine. A migration and test update are required for database enum changes.

### 6.4 Payment

```text
INITIATED -> PENDING -> SUCCEEDED
                    -> FAILED
                    -> CANCELLED
                    -> EXPIRED (worker closes the unpaid hold)
Verified late/risky success -> REVIEW_REQUIRED
Refund states belong to the separate refund table; refund execution is planned.
```

Late, duplicate, and out-of-order callbacks must be safe and must never move a terminal state backward.

## 7. New payment routes and planned route groups

The payment routes below are implemented as of 2026-10-19; other route groups remain targets. See [payment contracts](./payments.md) for exact behavior and outstanding verification.

### Payments

- `POST /api/v1/appointments/:appointmentId/payments`
- `GET /api/v1/payments/:paymentId`
- `POST /api/v1/payments/:paymentId/reconcile`
- `POST /api/v1/payments/sslcommerz/ipn`
- `POST /api/v1/payments/sslcommerz/success`
- `POST /api/v1/payments/sslcommerz/fail`
- `POST /api/v1/payments/sslcommerz/cancel`
- Planned: `POST /api/v1/admin/payments/:paymentId/refunds`

### Appointment lifecycle

- `GET /api/v1/doctors/me/appointments`
- `GET /api/v1/appointments/:appointmentId`
- `POST /api/v1/appointments/:appointmentId/cancel`
- `PATCH /api/v1/appointments/:appointmentId/status`

### Video consultations and chat

- `POST /api/v1/appointments/:appointmentId/consultation/token`
- `GET /api/v1/appointments/:appointmentId/consultation`
- `GET /api/v1/appointments/:appointmentId/messages`
- `POST /api/v1/appointments/:appointmentId/messages`

Realtime signaling and chat use authenticated Socket.IO events. Every event must verify appointment membership on the server; room names supplied by the client are not trusted.

### Documents and prescriptions

- `POST /api/v1/appointments/:appointmentId/documents/upload-url`
- `POST /api/v1/appointments/:appointmentId/documents`
- `GET /api/v1/documents/:documentId/download-url`
- `POST /api/v1/appointments/:appointmentId/prescriptions`
- `PATCH /api/v1/prescriptions/:prescriptionId`
- `POST /api/v1/prescriptions/:prescriptionId/finalize`
- `GET /api/v1/prescriptions/:prescriptionId`
- `GET /api/v1/prescriptions/:prescriptionId/pdf`

### Reviews, notifications, and operations

- `POST /api/v1/appointments/:appointmentId/reviews`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/:notificationId/read`
- `GET /api/v1/admin/appointments`
- `GET /api/v1/admin/payments`
- `GET /api/v1/admin/audit-events`

## 8. Acceptance scenarios for every route

At minimum, tests must cover:

- valid request and exact response/status;
- missing, malformed, boundary, and extra input where relevant;
- unauthenticated access;
- wrong role and wrong resource owner;
- suspended user denial;
- missing resource without leaking its existence;
- retry behavior and duplicate submission;
- two concurrent requests for the same limited resource;
- database rollback when a later step fails;
- logging that does not contain passwords, tokens, cookies, medical content, or document URLs.

For payment, consultation, document, and prescription features also test forged provider callbacks, expired access, out-of-order events, and attempts by unrelated users.

## 9. Route implementation checklist

Before considering a route complete:

1. Add a Zod request schema.
2. Add authentication and role middleware at the router boundary.
3. Delegate each route to a controller for validation/HTTP responses, and put business rules in the service.
4. Put persistence behind the repository interface.
5. Use a transaction for multi-row state changes.
6. Return stable errors, never database/provider errors directly.
7. Add service tests plus HTTP contract tests.
8. Update this document and the feature-specific document.
9. Run typecheck, tests, build, migration checks, and `git diff --check`.

## 10. Related documents

- [Development control](./DEVELOPMENT_CONTROL.md)
- [Backend architecture and code standard](./BACKEND_ARCHITECTURE_AND_CODE_STANDARD.md)
- [Database design and migrations](./DATABASE_DESIGN_AND_MIGRATIONS.md)
- [Source code map](./SOURCE_CODE_MAP.md)
- [Authentication details](./authentication.md)
- [Doctor directory details](./doctor-directory.md)
- [Scheduling details](./scheduling.md)
- [Appointment details](./appointments.md)
